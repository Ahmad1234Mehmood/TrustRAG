from __future__ import annotations
import re
from models import Scores

try:
    from ragas import evaluate as ragas_evaluate
    from ragas.metrics import faithfulness, answer_relevancy
    from datasets import Dataset
    _RAGAS_AVAILABLE = True
except ImportError:
    _RAGAS_AVAILABLE = False

def _score_with_ragas(question: str, answer: str, contexts: list[str]) -> Scores:
    ds = Dataset.from_dict({
        "question": [question],
        "answer":   [answer],
        "contexts": [contexts],
    })
    result = ragas_evaluate(ds, metrics=[faithfulness, answer_relevancy])
    df = result.to_pandas()
    return Scores(
        faithfulness     = round(float(df["faithfulness"].iloc[0]),     2),
        answer_relevancy = round(float(df["answer_relevancy"].iloc[0]), 2),
    )

def _heuristic_faithfulness(answer: str, contexts: list[str]) -> float:
    if not answer or not contexts:
        return 0.0
    combined_ctx = " ".join(contexts).lower()
    ctx_words = set(re.findall(r"\b\w{4,}\b", combined_ctx))

    sentences = [s.strip() for s in re.split(r"[.!?]", answer) if len(s.strip()) > 20]
    if not sentences:
        return 0.5

    supported = 0
    for sent in sentences:
        sent_words = set(re.findall(r"\b\w{4,}\b", sent.lower()))
        overlap = sent_words & ctx_words
        if len(overlap) / max(len(sent_words), 1) > 0.3:
            supported += 1
    return round(supported / len(sentences), 2)

def _heuristic_relevancy(question: str, answer: str) -> float:
    if not question or not answer:
        return 0.0
    q_words = set(re.findall(r"\b\w{4,}\b", question.lower()))
    a_words = set(re.findall(r"\b\w{4,}\b", answer.lower()))
    if not q_words:
        return 0.5
    overlap = q_words & a_words
    return round(min(len(overlap) / len(q_words), 1.0), 2)

def _score_heuristic(question: str, answer: str, contexts: list[str]) -> Scores:
    return Scores(
        faithfulness     = _heuristic_faithfulness(answer, contexts),
        answer_relevancy = _heuristic_relevancy(question, answer),
    )

def score_answer(question: str, answer: str, contexts: list[str]) -> Scores:
    from config import USE_RAGAS
    import os
    has_key = bool(os.getenv("OPENAI_API_KEY", ""))

    if USE_RAGAS and _RAGAS_AVAILABLE and has_key:
        try:
            return _score_with_ragas(question, answer, contexts)
        except Exception as e:
            print(f"[evaluate] RAGAs failed ({e}), using heuristic fallback.")

    return _score_heuristic(question, answer, contexts)
