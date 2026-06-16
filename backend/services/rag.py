from typing import List, Dict, Any, AsyncGenerator
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

client = Groq(api_key=GROQ_API_KEY)

async def generate_answer_stream(question: str, context_chunks: List[Dict[str, Any]]) -> AsyncGenerator[str, None]:
    """
    Yields text tokens from Groq as they are generated.
    """
    # Combine chunks into context, making sure the LLM sees the source and page
    context_parts = []
    for chunk in context_chunks:
        context_parts.append(f"[Source: {chunk['filename']}, Page {chunk['page']}]\n{chunk['text']}")
    
    context = "\n\n---\n\n".join(context_parts)
    
    system_prompt = (
        "You are a helpful assistant for a document analysis application called DocuMind. "
        "Use ONLY the provided context to answer the user's question. "
        "If the answer is not contained in the context, say 'I cannot answer this based on the provided documents.' "
        "Do not use outside knowledge."
    )
    
    user_message = f"Context:\n{context}\n\nQuestion:\n{question}"
    
    # We call Groq synchronously but iterate over the stream
    stream = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        model=GROQ_MODEL,
        temperature=0.2,
        stream=True
    )
    
    for chunk in stream:
        if chunk.choices and len(chunk.choices) > 0 and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
