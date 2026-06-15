from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

from services.pdf_parser import extract_text_from_pdf, chunk_text
from services.embedder import get_embeddings, get_embedding
from services.vector_store import add_chunks_to_db, query_db
from services.rag import generate_answer_stream
from config import CHUNK_SIZE, CHUNK_OVERLAP

app = FastAPI(title="DocuMind API")

# Allow requests from your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    target_filename: Optional[str] = None

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Endpoint to upload multiple PDFs, extract text with page numbers, chunk, embed, and save.
    """
    total_chunks = 0
    try:
        for file in files:
            if not file.filename.endswith(".pdf"):
                continue # Skip non-PDFs
            
            file_bytes = await file.read()
            
            # Extract list of pages
            pages_data = extract_text_from_pdf(file_bytes)
            
            # Intelligent chunking
            chunks = chunk_text(pages_data, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP)
            
            if chunks:
                embeddings = get_embeddings([c["text"] for c in chunks])
                add_chunks_to_db(chunks, embeddings, file.filename)
                total_chunks += len(chunks)
                
        if total_chunks == 0:
            raise HTTPException(status_code=400, detail="No extractable text found in any of the PDFs")

        return {
            "message": f"Successfully processed documents", 
            "chunks_stored": total_chunks
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_document(request: QueryRequest):
    """
    Endpoint to receive a question, search for chunks, and stream the LLM response via SSE.
    """
    try:
        question_embedding = get_embedding(request.question)
        # Pass target_filename to scope the vector search
        context_chunks = query_db(question_embedding, n_results=10, filename=request.target_filename) 
 
        
        async def event_generator():
            # 1. Send sources first as a special JSON event
            sources_event = json.dumps({
                "type": "sources", 
                "data": context_chunks
            })
            yield f"data: {sources_event}\n\n"
            
            if not context_chunks:
                # Provide a quick fallback if database is empty
                fallback_event = json.dumps({
                    "type": "token", 
                    "data": "I haven't processed any documents yet! Please upload a PDF first."
                })
                yield f"data: {fallback_event}\n\n"
                return
                
            # 2. Generate and yield answer tokens sequentially
            async for token in generate_answer_stream(request.question, context_chunks):
                token_event = json.dumps({
                    "type": "token", 
                    "data": token
                })
                yield f"data: {token_event}\n\n"
                
        return StreamingResponse(event_generator(), media_type="text/event-stream")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
async def list_documents():
    """
    Returns a list of all documents currently stored in the database.
    """
    try:
        from services.vector_store import get_all_documents
        docs = get_all_documents()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """
    Deletes a specific document from the database by filename.
    """
    try:
        from services.vector_store import delete_document_from_db
        delete_document_from_db(filename)
        return {"message": f"Successfully deleted '{filename}' from the database"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
