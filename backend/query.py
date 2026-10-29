from __future__ import annotations
from rank_bm25 import BM25Okapi
from openai import OpenAI
from ingest import get_embed_model, get_collection
from models import Citation
from config import (
    N_RESULTS, BM25_WEIGHT, LLM_MODEL, OPENAI_API_KEY,
    USE_OLLAMA, OLLAMA_HOST,
    USE_GROQ, GROQ_API_KEY, GROQ_MODEL,
    USE_HF, HF_TOKEN, HF_MODEL,
)

def get_llm_client():
    if USE_GROQ:
        return OpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)
    if USE_HF:
        return OpenAI(base_url="https://api-inference.huggingface.co/v1/", api_key=HF_TOKEN)
    if USE_OLLAMA:
        return OpenAI(base_url=f"{OLLAMA_HOST}/v1", api_key="ollama")
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENAI_API_KEY)

def get_model_name() -> str:
    if USE_GROQ:   return GROQ_MODEL
    if USE_HF:     return HF_MODEL
    if USE_OLLAMA: return "llama3"
    return LLM_MODEL

def vector_search(
    question: str,
    n: int = N_RESULTS,
    doc_id: str | None = None,
    collection_name: str = "main",
) -> list[dict]:
    collection = get_collection(collection_name)
    q_embed = get_embed_model().encode([question]).tolist()

    where = {"doc_id": doc_id} if doc_id else None
    try:
        results = collection.query(
            query_embeddings=q_embed,
            n_results=min(n, collection.count()),
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    chunks = []
    for i, (doc, meta, dist) in enumerate(
        zip(results["documents"][0], results["metadatas"][0], results["distances"][0])
    ):
        chunks.append({
            "text":        doc,
            "source":      meta.get("source", "unknown"),
            "page":        meta.get("page", 1),
            "chunk_index": meta.get("chunk_index", i),
            "score_vec":   float(1 - dist),
        })
    return chunks

def bm25_search(question: str, all_chunks: list[dict], n: int = N_RESULTS) -> list[dict]:
    if not all_chunks:
        return []
    tokenized = [c["text"].lower().split() for c in all_chunks]
    bm25 = BM25Okapi(tokenized)
    scores = bm25.get_scores(question.lower().split())
    ranked = sorted(range(len(scores)), key=lambda i: -scores[i])
    result = []
    for idx in ranked[:n]:
        chunk = dict(all_chunks[idx])
        chunk["score_bm25"] = float(scores[idx])
        result.append(chunk)
    return result

def hybrid_retrieve(
    question: str,
    n: int = N_RESULTS,
    doc_id: str | None = None,
    collection_name: str = "main",
) -> list[dict]:
    vec_chunks = vector_search(question, n=n * 2, doc_id=doc_id, collection_name=collection_name)
    bm_chunks  = bm25_search(question, vec_chunks, n=n * 2)

    scored: dict[str, dict] = {}
    for rank, c in enumerate(vec_chunks):
        key = c["text"][:80]
        if key not in scored:
            scored[key] = dict(c)
        scored[key]["combined"] = scored[key].get("combined", 0) + (1 - BM25_WEIGHT) * (1 / (rank + 1))

    for rank, c in enumerate(bm_chunks):
        key = c["text"][:80]
        if key not in scored:
            scored[key] = dict(c)
        scored[key]["combined"] = scored[key].get("combined", 0) + BM25_WEIGHT * (1 / (rank + 1))

    ranked = sorted(scored.values(), key=lambda x: -x.get("combined", 0))
    return ranked[:n]

def build_prompt(question: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, c in enumerate(chunks, 1):
        src = f"{c.get('source','doc')}, page {c.get('page',1)}"
        context_parts.append(f"[{i}] ({src})\n{c['text']}")
    context = "\n\n".join(context_parts)

    return f"""You are a precise document assistant. Answer using ONLY the context provided.

Rules:
- Cite every claim with [1], [2] etc. matching the source numbers above.
- If the context does not contain enough information, say "I don't have enough information in the provided documents to answer this."
- Never use your training knowledge — only the context.
- Be concise and direct.

Context:
{context}

Question: {question}

Answer (with citations):"""

def generate_answer(question: str, chunks: list[dict]) -> tuple[str, list[Citation]]:
    if not chunks:
        return "No relevant documents found to answer this question.", []

    prompt   = build_prompt(question, chunks)
    client   = get_llm_client()
    response = client.chat.completions.create(
        model=get_model_name(),
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024,
    )
    answer = response.choices[0].message.content.strip()

    citations = [
        Citation(
            index=i + 1,
            text=c["text"][:300],
            source=c.get("source", "unknown"),
            page=c.get("page", 1),
            chunk_index=c.get("chunk_index", i),
        )
        for i, c in enumerate(chunks)
    ]
    return answer, citations
