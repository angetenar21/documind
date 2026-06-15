import fitz
from typing import List, Dict, Any
import re

def extract_text_from_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text while preserving page numbers.
    Returns a list of dictionaries: [{"text": "...", "page": 1}, ...]
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages_data = []
    
    # fitz pages are 0-indexed, humans read 1-indexed
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        if text.strip():
            pages_data.append({
                "text": text,
                "page": page_num
            })
            
    return pages_data

def chunk_text(pages_data: List[Dict[str, Any]], chunk_size: int = 1000, overlap: int = 150) -> List[Dict[str, Any]]:
    """
    Intelligently chunks text by paragraphs, preserving the page metadata.
    Returns a list of dictionaries containing the chunk text and its source page.
    """
    chunks = []
    
    for page_data in pages_data:
        text = page_data["text"]
        page_num = page_data["page"]
        
        # Split by paragraphs (double newlines)
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_chunk_text = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            # If adding this paragraph exceeds our size, save the current chunk
            if len(current_chunk_text) + len(para) > chunk_size and current_chunk_text:
                chunks.append({
                    "text": current_chunk_text.strip(),
                    "page": page_num
                })
                # Keep a small overlap from the end of the previous chunk for context
                overlap_text = current_chunk_text[-overlap:] if len(current_chunk_text) > overlap else current_chunk_text
                current_chunk_text = overlap_text + "\n\n" + para
            else:
                current_chunk_text += "\n\n" + para if current_chunk_text else para
                
        # Don't forget the last chunk on the page
        if current_chunk_text.strip():
            chunks.append({
                "text": current_chunk_text.strip(),
                "page": page_num
            })
            
    return chunks