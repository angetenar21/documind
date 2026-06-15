import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
from config import CHROMA_PATH, CHROMA_HOST, CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE

if CHROMA_HOST:
    # Use remote hosted ChromaDB on Render/ChromaCloud
    chroma_client = chromadb.HttpClient(
        host=CHROMA_HOST,
        tenant=CHROMA_TENANT,
        database=CHROMA_DATABASE,
        settings=Settings(
            chroma_client_auth_provider="chromadb.auth.token_auth.TokenAuthClientProvider",
            chroma_client_auth_credentials=CHROMA_API_KEY
        )
    )
else:
    # Fallback to local persistent client
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

collection = chroma_client.get_or_create_collection(name="document_chunks")

def add_chunks_to_db(chunks: List[Dict[str, Any]], embeddings: List[List[float]], filename: str):
    """
    Stores chunks and their embeddings in ChromaDB, along with filename and page metadata.
    """
    ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]
    
    documents = [c["text"] for c in chunks]
    metadatas = [{"filename": filename, "page": c["page"]} for c in chunks]
    
    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

def query_db(query_embedding: List[float], n_results: int = 5, filename: str = None) -> List[Dict[str, Any]]:
    """
    Searches ChromaDB for the chunks most similar to our query embedding.
    If filename is provided, scopes the search to only that document.
    """
    query_args = {
        "query_embeddings": [query_embedding],
        "n_results": n_results
    }
    
    if filename and filename != "All Documents":
        query_args["where"] = {"filename": filename}
        
    results = collection.query(**query_args)
    
    matched_chunks = []
    if results["documents"] and results["documents"][0]:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        for i in range(len(docs)):
            matched_chunks.append({
                "text": docs[i],
                "filename": metas[i].get("filename", "Unknown"),
                "page": metas[i].get("page", 0)
            })
            
    return matched_chunks

def delete_document_from_db(filename: str):
    """
    Deletes all chunks associated with a specific filename from ChromaDB.
    """
    collection.delete(where={"filename": filename})

def get_all_documents() -> List[str]:
    """
    Returns a list of unique filenames currently stored in the database.
    """
    results = collection.get(include=["metadatas"])
    filenames = set()
    if results["metadatas"]:
        for meta in results["metadatas"]:
            if meta and "filename" in meta:
                filenames.add(meta["filename"])
    return list(filenames)

