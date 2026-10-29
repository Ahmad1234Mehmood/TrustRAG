from __future__ import annotations
from query import hybrid_retrieve, generate_answer, get_llm_client, get_model_name
from evaluate import score_answer
from models import AskResponse, Scores, RetryStep
from config import FAITH_THRESHOLD, MAX_RETRIES

def rewrite_query(original: str, attempt: int, low_score: float) -> str:
    client = get_llm_client()
    model  = get_model_name()

    prompt = (
        f"The following search query returned a low-quality answer "
        f"(faithfulness={low_score:.2f}). "
        f"Rewrite it using different keywords to find better information.\n\n"
        f"Original query: {original}\n\n"
        f"Rewritten query (attempt {attempt}, one line only):"
    )
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=100,
        )
        return resp.choices[0].message.content.strip().strip('"\'')
    except Exception:
        words = original.split()
        return " ".join(words[:3]) + " details information" if len(words) > 2 else original + " explain"

def run(
    question: str,
    doc_id: str | None = None,
    collection_name: str = "main",
) -> AskResponse:
    retry_history: list[RetryStep] = []
    best_answer    = ""
    best_citations = []
    best_scores    = Scores(faithfulness=0.0, answer_relevancy=0.0)
    best_score_val = -1.0

    query = question
    for attempt in range(MAX_RETRIES + 1):
        chunks       = hybrid_retrieve(query, doc_id=doc_id, collection_name=collection_name)
        answer, cits = generate_answer(query, chunks)
        contexts     = [c["text"] for c in chunks]
        scores       = score_answer(question, answer, contexts)

        step = RetryStep(
            attempt=attempt + 1,
            query_used=query,
            faithfulness=scores.faithfulness,
        )
        retry_history.append(step)

        if scores.faithfulness > best_score_val:
            best_answer    = answer
            best_citations = cits
            best_scores    = scores
            best_score_val = scores.faithfulness

        if scores.faithfulness >= FAITH_THRESHOLD:
            break

        if attempt < MAX_RETRIES:
            query = rewrite_query(question, attempt + 1, scores.faithfulness)

    retried = len(retry_history) > 1

    return AskResponse(
        answer        = best_answer,
        citations     = best_citations,
        scores        = best_scores,
        retried       = retried,
        retry_history = retry_history,
        doc_id        = doc_id,
    )
