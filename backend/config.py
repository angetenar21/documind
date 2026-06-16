import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
CHROMA_PATH = "chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
GROQ_MODEL = "llama-3.1-8b-instant"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Chroma Cloud / Remote DB settings
CHROMA_HOST = os.getenv("CHROMA_HOST")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT", "default_tenant")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE", "default_database")
HF_TOKEN = os.getenv("HF_TOKEN")