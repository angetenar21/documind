import requests
from typing import List
from config import EMBEDDING_MODEL, HF_TOKEN

API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/{EMBEDDING_MODEL}"
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

def get_embedding(text: str) -> List[float]:
    """Generates an embedding for a single string using Hugging Face API."""
    response = requests.post(API_URL, headers=HEADERS, json={"inputs": [text]})
    if response.status_code != 200:
        raise Exception(f"Failed to generate embedding: {response.text}")
    
    data = response.json()
    # The API returns a list of lists since we sent an array of 1 element
    return data[0]

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a list of strings using Hugging Face API in batches."""
    all_embeddings = []
    batch_size = 50
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = requests.post(API_URL, headers=HEADERS, json={"inputs": batch})
        if response.status_code != 200:
            raise Exception(f"Failed to generate embeddings: {response.text}")
        
        all_embeddings.extend(response.json())
        
    return all_embeddings
