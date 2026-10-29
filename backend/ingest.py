from __future__ import annotations
import fitz
import uuid
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from config import VECTOR_DIR, EMBED_MODEL, CHUNK_SIZE, CHUNK_OVERLAP

_embed_model: SentenceTransformer | None = None
_chroma_client: chromadb.PersistentClient | None = None

def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer(EMBED_MODEL)
    return _embed_model

def get_chroma() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        VECTOR_DIR.mkdir(parents=True, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=str(VECTOR_DIR))
    return _chroma_client

def get_collection(name: str = "main"):
    return get_chroma().get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )

def extract_text_with_pages(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text")
        if text.strip():
            pages.append({"text": text, "page": i + 1})
    doc.close()
    return pages

def chunk_pages(pages: list[dict], doc_id: str) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = []
    for pg in pages:
        pieces = splitter.split_text(pg["text"])
        for i, piece in enumerate(pieces):
            if piece.strip():
                chunks.append({
                    "text":        piece.strip(),
                    "page":        pg["page"],
                    "chunk_index": len(chunks),
                    "doc_id":      doc_id,
                })
    return chunks

def ingest_pdf(
    pdf_path: str,
    filename: str,
    doc_id: str | None = None,
    collection_name: str = "main",
) -> dict:
    doc_id = doc_id or str(uuid.uuid4())
    pages  = extract_text_with_pages(pdf_path)
    chunks = chunk_pages(pages, doc_id)

    if not chunks:
        raise ValueError("No text extracted from PDF.")

    texts      = [c["text"] for c in chunks]
    embeddings = get_embed_model().encode(texts, show_progress_bar=False).tolist()

    ids  = [f"{doc_id}_c{c['chunk_index']}" for c in chunks]
    metas = [
        {
            "doc_id":      c["doc_id"],
            "source":      filename,
            "page":        c["page"],
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]

    collection = get_collection(collection_name)
    batch = 100
    for i in range(0, len(ids), batch):
        collection.add(
            documents=texts[i : i + batch],
            embeddings=embeddings[i : i + batch],
            ids=ids[i : i + batch],
            metadatas=metas[i : i + batch],
        )

    return {"doc_id": doc_id, "filename": filename, "chunks": len(chunks)}
