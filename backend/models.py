from pydantic import BaseModel
from typing import Optional

class AskRequest(BaseModel):
    question: str
    doc_id:   Optional[str] = None

class Citation(BaseModel):
    index:   int
    text:    str
    source:  str
    page:    int
    chunk_index: int

class RetryStep(BaseModel):
    attempt:     int
    query_used:  str
    faithfulness: float

class Scores(BaseModel):
    faithfulness:     float
    answer_relevancy: float

class AskResponse(BaseModel):
    answer:        str
    citations:     list[Citation]
    scores:        Scores
    retried:       bool
    retry_history: list[RetryStep]
    doc_id:        Optional[str]

class UploadResponse(BaseModel):
    doc_id: str
    filename: str
    chunks:   int

class LiveFailure(BaseModel):
    question:         str
    scores:           Scores
    retried:          bool
    retry_count:      int
    likely_reason:    str
    retrieved_chunks: list[str]
    timestamp:        str

class ExhibitRunResponse(BaseModel):
    name:       str
    title:      str
    query:      str
    answer:     str
    citations:  list[Citation]
    scores:     Scores
    explanation: str
    failure_reason: str
    retrieved_chunks: list[str] = []
