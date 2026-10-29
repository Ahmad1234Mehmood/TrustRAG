import { useState } from "react";
import { runExhibit } from "../../api";
import ScoreBadge from "../ScoreBadge";

const FAILURE_COLORS = {
  split_sentence:  { color: "var(--purple)",   bg: "var(--purple-bg)",   border: "var(--purple-b)",  icon: "✂️" },
  out_of_scope:    { color: "var(--orange)",   bg: "var(--orange-bg)",   border: "var(--orange-b)", icon: "🌍" },
  outdated_chunk:  { color: "var(--blue)",     bg: "var(--blue-bg)",     border: "var(--blue-b)",   icon: "📅" },
  confident_wrong: { color: "var(--red)",      bg: "var(--red-bg)",      border: "var(--red-b)",    icon: "⚠️" },
  noisy_retrieval: { color: "var(--teal)",     bg: "var(--teal-bg)",     border: "var(--teal-b)",   icon: "🔊" },
};

function ChunkItem({ chunk, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 6,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: "var(--surface)",
          border: "none",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--fg)",
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span>Chunk [{index + 1}]</span>
        <span style={{ color: "var(--fg3)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          padding: "8px 12px",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--fg2)",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
        }}>
          {chunk}
        </div>
      )}
    </div>
  );
}

export default function ExhibitCard({ exhibit }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const style = FAILURE_COLORS[exhibit.name] ?? FAILURE_COLORS.split_sentence;

  async function handleRun() {
    setLoading(true);
    setError("");
    try {
      const data = await runExhibit(exhibit.name);
      setResult(data);
      setOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      border: `1px solid ${style.border}`,
      borderRadius: 12,
      overflow: "hidden",
      background: "var(--bg)",
    }}>
      {/* Header */}
      <div style={{
        background: style.bg,
        borderBottom: `1px solid ${style.border}`,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>{style.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: style.color }}>
            {exhibit.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>
            Query: <em>"{exhibit.query}"</em>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            background: style.color,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {loading ? "Running…" : result ? "Re-run" : "Run Exhibit"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 18px", color: "var(--red)", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && open && (
        <div style={{ padding: "14px 18px" }}>
          {/* Answer */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Generated Answer
            </div>
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--fg)",
            }}>
              {result.answer}
            </div>
            {result.scores && <ScoreBadge scores={result.scores} />}
          </div>

          {/* Failure explanation */}
          <div style={{
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Why This Fails
            </div>
            <div style={{ fontSize: 13, color: "var(--fg2)", lineHeight: 1.6 }}>
              {result.explanation}
            </div>
          </div>

          {/* Retrieved chunks */}
          {result.retrieved_chunks?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Retrieved Context ({result.retrieved_chunks.length} chunks)
              </div>
              {result.retrieved_chunks.map((chunk, i) => (
                <ChunkItem key={i} chunk={chunk} index={i} />
              ))}
            </div>
          )}

          <button
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "var(--fg3)",
              marginTop: 10,
              cursor: "pointer",
            }}
          >
            Collapse ▲
          </button>
        </div>
      )}
    </div>
  );
}
