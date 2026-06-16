from typing import List
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

# Initialize the model at the module level so it's loaded only once.
# On the very first run, it will download the model from Hugging Face.
model = SentenceTransformer(EMBEDDING_MODEL)

def get_embedding(text: str) -> List[float]:
    """Generates an embedding for a single string (used for the user's question)."""
    # encode returns a numpy array, we convert it to a standard list of floats
    return model.encode(text).tolist()

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a list of strings (used for our PDF chunks)."""
    # encode can take a list of strings and process them efficiently in batches
    embeddings = model.encode(texts)
    return embeddings.tolist()
