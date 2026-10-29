import { useEffect, useMemo, useState } from "react";
import { listMuseum } from "../../api";
import ExhibitCard from "./ExhibitCard";
import LiveFailureCard from "./LiveFailureCard";

function likelyReason(faithfulness, retried) {
  if (faithfulness === 0.0) return "Out-of-scope question — document has no relevant information";
  if (retried && faithfulness < 0.60) return "Low-quality retrieval — self-heal triggered but answer remained weak";
  if (retried) return "Self-heal improved the answer — first attempt was weak";
  if (faithfulness < 0.50) return "Hallucination risk — answer poorly grounded in document";
  return "Partial grounding — answer only partly supported by retrieved chunks";
}

function computeLiveFailures(messages) {
  const failures = [];
  messages.forEach((msg, i) => {
    if (msg.role !== "assistant" || !msg.scores) return;
    const { faithfulness } = msg.scores;
    if (!(faithfulness < 0.80 || msg.retried)) return;

    const question = [...messages.slice(0, i)].reverse().find(m => m.role === "user")?.text ?? "";
    failures.push({
      question,
      scores: msg.scores,
      retried: !!msg.retried,
      retry_count: msg.retryHistory?.length ?? 0,
      likely_reason: likelyReason(faithfulness, !!msg.retried),
      retrieved_chunks: (msg.citations ?? []).map(c => c.text),
      timestamp: new Date(msg.id).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  });
  return failures.slice(-5).reverse();
}

export default function MuseumPage({ messages = [] }) {
  const [exhibits, setExhibits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const liveFailures = useMemo(() => computeLiveFailures(messages), [messages]);

  useEffect(() => {
    listMuseum()
      .then(setExhibits)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <span style={{ color: "var(--fg3)", fontSize: 14 }}>⏳ Loading exhibits…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "var(--red-bg)", border: "1px solid var(--red-b)",
        borderRadius: 10, padding: 16, color: "var(--red)", fontSize: 14,
      }}>
        ❌ Failed to load museum: {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🏛️</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--fg)" }}>
          Failure Mode Museum
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--fg3)", lineHeight: 1.6, maxWidth: 540 }}>
          Five curated exhibits demonstrating real RAG failure modes — each with a crafted
          dataset that triggers a specific bug. Run any exhibit to see the failure live,
          understand why it happens, and learn how to fix it.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
          📄 Live Failures — from your real uploaded PDF
        </h3>
        <p style={{ margin: "6px 0 16px", fontSize: 13, color: "var(--fg3)", lineHeight: 1.6, maxWidth: 540 }}>
          Your Document Failures — real failures from your current chat session: questions where
          the answer quality was low or self-heal was triggered. Clearing the chat clears this too.
        </p>

        {liveFailures.length === 0 && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 16, color: "var(--fg3)", fontSize: 14,
          }}>
            No failures recorded yet. Ask questions in the Chat tab — low-quality answers
            will appear here.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {liveFailures.map((failure, i) => (
            <LiveFailureCard key={i} failure={failure} />
          ))}
        </div>
      </div>

      <h3 style={{ margin: "40px 0 12px", fontSize: 15, fontWeight: 700, color: "var(--fg)" }}>
        🧪 Classic Failure Cases — synthetic demo documents
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {exhibits.map(exhibit => (
          <ExhibitCard key={exhibit.name} exhibit={exhibit} />
        ))}
      </div>

      <div style={{
        marginTop: 32,
        padding: "14px 18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontSize: 13,
        color: "var(--fg2)",
        lineHeight: 1.7,
      }}>
        <strong style={{ color: "var(--fg)" }}>💡 How to use this museum</strong>
        <br />
        Each exhibit uses a small in-memory vector database pre-seeded with synthetic
        documents designed to trigger a specific failure. The query is fixed.
        Run the exhibit, observe the faithfulness score drop, then read the explanation
        to understand the root cause.
        <br /><br />
        These are intentional bugs — not things to fix in the code, but patterns to
        recognize in production RAG systems so you can design around them.
      </div>
    </div>
  );
}
