# DocuMind - RAG Document Assistant

DocuMind is an interactive Retrieval-Augmented Generation (RAG) Document Assistant. It enables you to upload PDF documents and ask questions about them in an interactive chat interface. 

The application consists of a React frontend and a FastAPI backend, utilizing ChromaDB for vector storage and Groq for fast LLM inference.

## Project Structure

- `frontend/`: React-based web interface for document upload and interactive Q&A.
- `backend/`: FastAPI application handling PDF parsing, vector embeddings (ChromaDB), and RAG pipeline integration.

## Tech Stack

- **Frontend**: React
- **Backend**: Python, FastAPI
- **Vector Database**: ChromaDB
- **LLM**: Groq

## Getting Started

### Prerequisites

- Node.js (for the frontend)
- Python 3.9+ (for the backend)
- A Groq API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your environment variables:
   Create a `.env` file in the `backend/` directory and add your keys (e.g., `GROQ_API_KEY`).
   
5. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend should now be running on `http://localhost:8000`.*

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. Open the frontend in your browser.
2. Upload a PDF document through the interface.
3. The backend will parse the PDF, generate embeddings, and store them in the local ChromaDB.
4. Start asking questions about your document through the chat interface!
