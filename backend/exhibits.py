from __future__ import annotations
import chromadb
from sentence_transformers import SentenceTransformer
from query import generate_answer
from evaluate import score_answer
from models import Citation, ExhibitRunResponse, Scores
from ingest import get_embed_model

_exhibit_client = chromadb.Client()

EXHIBITS = {
    "split_sentence": {
        "title":  "Exhibit 1 — The Split Sentence",
        "query":  "Can employees carry over unused vacation days?",
        "failure_reason": "The critical condition was cut across two chunks by the chunking algorithm. The system retrieved only the first half of the sentence, missing the 'only if approved by manager' condition.",
        "explanation": "Chunking splits documents into fixed-size pieces. When a sentence like 'Employees may carry over up to 10 days — only if approved by their manager' is cut in the middle, the AI sees an incomplete rule and answers incorrectly.",
        "docs": [
            "Section 4: Annual Leave Policy\n\nEmployees are entitled to 20 working days of annual leave per year. Unused leave from the current year may be carried over to the following year. The maximum carry-over amount is 10 days.",
            "Only if approved in advance by the direct line manager and the HR department. Carry-over requests must be submitted before December 1st of the current year. Late requests will not be approved.",
            "Section 5: Sick Leave\n\nEmployees are entitled to 10 days of sick leave per year. Sick leave does not carry over. A medical certificate is required for absences longer than 3 consecutive days.",
        ],
    },
    "out_of_scope": {
        "title":  "Exhibit 2 — The Out-of-Scope Question",
        "query":  "What is the capital of France?",
        "failure_reason": "The question has nothing to do with the document. The system retrieved random HR chunks (the closest matches it could find), then the AI answered from its training memory instead of the document. Faithfulness = very low.",
        "explanation": "RAG systems cannot tell you when a question is outside their knowledge base. The AI answers 'Paris' from memory, not the document — but the system confidently presents it as document-grounded. It should have said 'I don't know based on the provided documents.'",
        "docs": [
            "Employee Handbook v3.2 — Human Resources Department\n\nThis handbook covers all policies for full-time and part-time employees. It applies to all staff at headquarters and remote locations.",
            "Section 1: Code of Conduct\n\nAll employees are expected to maintain professional standards at all times. Harassment, discrimination, and misconduct will result in disciplinary action.",
            "Section 2: Working Hours\n\nStandard working hours are Monday to Friday, 9:00 AM to 6:00 PM. Flexible working arrangements may be available upon manager approval.",
        ],
    },
    "outdated_chunk": {
        "title":  "Exhibit 3 — The Outdated Chunk",
        "query":  "How many days do I have to request a refund?",
        "failure_reason": "The document contains both an old policy (14 days) and a new updated policy (30 days). The old policy had a higher embedding similarity to the query, so the system retrieved it instead of the correct current policy.",
        "explanation": "Vector embeddings do not understand 'newer' or 'updated'. The outdated section happened to match the query semantically better than the updated section. The AI answered with the old 14-day policy confidently.",
        "docs": [
            "REFUND POLICY — Version 1.0 (Superseded)\n\nCustomers may request a refund within 14 days of purchase. To initiate a refund, contact support@company.com with your order number and reason for return.",
            "REFUND POLICY — Version 2.0 (Current, effective Jan 2024)\n\nFollowing customer feedback, our refund window has been extended. Customers now have 30 days from the date of purchase to request a full refund. No questions asked.",
            "EXCHANGES AND STORE CREDIT\n\nFor exchanges, customers have 60 days from purchase. Store credit does not expire and can be used on any future purchase.",
        ],
    },
    "confident_wrong": {
        "title":  "Exhibit 4 — The Confident Wrong Answer",
        "query":  "How many vacation days do managers get?",
        "failure_reason": "The document only states the vacation policy for 'employees'. The AI generalized from 'employees' to 'managers' — a logical-sounding but incorrect inference. The document never mentions managers specifically.",
        "explanation": "LLMs are trained to be helpful and complete answers even when the context is ambiguous. The model reads 'employees get 20 days' and infers 'managers probably get the same or more' — but the document never says this. A grounded system should say 'the document does not specify managers separately.'",
        "docs": [
            "Section 3: Employee Benefits\n\nAll full-time employees are entitled to the following benefits: 20 days annual paid vacation, 10 days sick leave, 5 days personal leave. Benefits apply after a 3-month probation period.",
            "Section 3.1: Probation Period\n\nNew employees undergo a 3-month probation period during which they are not entitled to annual leave. After successful completion, full benefits are activated.",
            "Section 4: Performance Review\n\nAnnual performance reviews are conducted in December. Results determine eligibility for salary increases and bonuses for the following year.",
        ],
    },
    "noisy_retrieval": {
        "title":  "Exhibit 5 — The Noisy Retrieval",
        "query":  "What is the sick leave policy?",
        "failure_reason": "5 chunks were retrieved. Only 1 actually contains sick leave information. The other 4 are about unrelated HR topics (vacation, equipment, expenses, onboarding) that happened to have some keyword overlap. The AI mixes correct sick leave info with garbage from the noise.",
        "explanation": "With N=5 retrieval, if your document covers many different topics, you will often retrieve irrelevant chunks. When the AI prompt is flooded with noise, it starts incorporating wrong information into the answer. This is why context precision matters in RAGAs.",
        "docs": [
            "Section 7: Sick Leave Policy\n\nEmployees are entitled to 10 days of paid sick leave per year. For absences of 1-3 days, self-certification is accepted. For absences longer than 3 days, a doctor's certificate is required. Unused sick leave does not carry over to the next year.",
            "Section 2: Annual Leave\n\nAll employees receive 20 days of annual leave. Leave must be approved by the line manager at least 2 weeks in advance. Unused leave up to 5 days can be carried over.",
            "Section 8: Equipment Policy\n\nAll company equipment must be returned upon termination. Lost or damaged equipment may result in deductions. Laptops are replaced every 3 years.",
            "Section 6: Expense Claims\n\nExpense claims must be submitted within 30 days with receipts. Claims over £500 require director approval. Meals are reimbursed up to £40 per day when travelling.",
            "Section 1: Onboarding\n\nNew employees complete a 2-week onboarding program. This includes IT setup, compliance training, and department orientation. A buddy is assigned for the first month.",
        ],
    },
}

def _seed_exhibit(name: str) -> chromadb.Collection:
    try:
        _exhibit_client.delete_collection(name)
    except Exception:
        pass

    collection = _exhibit_client.create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )
    model = get_embed_model()
    docs  = EXHIBITS[name]["docs"]
    embs  = model.encode(docs, show_progress_bar=False).tolist()
    ids   = [f"{name}_{i}" for i in range(len(docs))]
    metas = [{"source": f"{name}.pdf", "page": i + 1, "chunk_index": i} for i in range(len(docs))]

    collection.add(documents=docs, embeddings=embs, ids=ids, metadatas=metas)
    return collection

def run_exhibit(name: str) -> ExhibitRunResponse:
    if name not in EXHIBITS:
        raise ValueError(f"Unknown exhibit: {name}")

    ex = EXHIBITS[name]
    collection = _seed_exhibit(name)

    q_embed = get_embed_model().encode([ex["query"]]).tolist()
    results = collection.query(
        query_embeddings=q_embed,
        n_results=min(5, len(ex["docs"])),
        include=["documents", "metadatas"],
    )
    chunks = [
        {
            "text":        doc,
            "source":      meta.get("source", f"{name}.pdf"),
            "page":        meta.get("page", 1),
            "chunk_index": meta.get("chunk_index", i),
        }
        for i, (doc, meta) in enumerate(
            zip(results["documents"][0], results["metadatas"][0])
        )
    ]

    answer, cits = generate_answer(ex["query"], chunks)
    contexts     = [c["text"] for c in chunks]
    scores       = score_answer(ex["query"], answer, contexts)

    return ExhibitRunResponse(
        name             = name,
        title            = ex["title"],
        query            = ex["query"],
        answer           = answer,
        citations        = cits,
        scores           = scores,
        explanation      = ex["explanation"],
        failure_reason   = ex["failure_reason"],
        retrieved_chunks = contexts,
    )

def list_exhibits() -> list[dict]:
    return [
        {"name": name, "title": ex["title"], "query": ex["query"]}
        for name, ex in EXHIBITS.items()
    ]
