import chromadb
from typing import List, Dict, Any
from config import CHROMA_PATH

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

def query_db(query_embedding: List[float], n_results: int = 5) -> List[Dict[str, Any]]:
    """
    Searches ChromaDB for the chunks most similar to our query embedding.
    Returns a list of dictionaries containing text, filename, and page.
    """
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )
    
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

