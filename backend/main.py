import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import selfheal
import exhibits as museum
from ingest import ingest_pdf
from models import AskRequest, AskResponse, UploadResponse, ExhibitRunResponse, LiveFailure

app = FastAPI(
    title="TrustRAG API",
    version="1.0.0",
    description="RAG with citations, evaluation, self-healing, and failure museum",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_docs: dict[str, str] = {}

live_failures: list[LiveFailure] = []

def _likely_reason(faithfulness: float, retried: bool) -> str:
    if faithfulness == 0.0:
        return "Out-of-scope question — document has no relevant information"
    if retried and faithfulness < 0.60:
        return "Low-quality retrieval — self-heal triggered but answer remained weak"
    if retried:
        return "Self-heal improved the answer — first attempt was weak"
    if faithfulness < 0.50:
        return "Hallucination risk — answer poorly grounded in document"
    return "Partial grounding — answer only partly supported by retrieved chunks"

@app.get("/health")
def health():
    return {"status": "ok", "docs_loaded": len(_docs)}

@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = ingest_pdf(
            pdf_path=tmp_path,
            filename=file.filename,
        )
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    _docs[result["doc_id"]] = file.filename
    return UploadResponse(**result)

@app.get("/docs")
def list_docs():
    return [{"doc_id": k, "filename": v} for k, v in _docs.items()]

@app.post("/ask", response_model=AskResponse)
def ask(body: AskRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if body.doc_id and body.doc_id not in _docs:
        raise HTTPException(status_code=404, detail=f"doc_id '{body.doc_id}' not found.")

    result = selfheal.run(question=body.question, doc_id=body.doc_id)

    if result.scores.faithfulness < 0.80 or result.retried:
        live_failures.append(LiveFailure(
            question=body.question,
            scores=result.scores,
            retried=result.retried,
            retry_count=len(result.retry_history),
            likely_reason=_likely_reason(result.scores.faithfulness, result.retried),
            retrieved_chunks=[c.text for c in result.citations],
            timestamp=datetime.now().strftime("%H:%M"),
        ))
        del live_failures[:-5]

    return result

@app.get("/live-failures", response_model=list[LiveFailure])
def list_live_failures():
    return list(reversed(live_failures))

@app.get("/museum")
def list_museum():
    return museum.list_exhibits()

@app.get("/museum/{name}", response_model=ExhibitRunResponse)
def run_exhibit(name: str):
    try:
        return museum.run_exhibit(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exhibit error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
