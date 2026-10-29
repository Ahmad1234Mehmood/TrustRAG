import { useState } from "react";
import ScoreBadge from "../ScoreBadge";

function ChunkItem({ chunk, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "var(--surface)", border: "none", padding: "8px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 12, color: "var(--fg)", fontWeight: 600, textAlign: "left",
        }}
      >
        <span>Chunk [{index + 1}]</span>
        <span style={{ color: "var(--fg3)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          padding: "8px 12px", fontSize: 12, lineHeight: 1.5, color: "var(--fg2)",
          background: "var(--bg)", borderTop: "1px solid var(--border)",
          fontFamily: "monospace", whiteSpace: "pre-wrap",
        }}>
          {chunk}
        </div>
      )}
    </div>
  );
}

export default function LiveFailureCard({ failure }) {
  const [chunksOpen, setChunksOpen] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--fg)" }}>"{failure.question}"</div>
          <span style={{ fontSize: 11, color: "var(--fg3)", flexShrink: 0 }}>{failure.timestamp}</span>
        </div>

        <ScoreBadge scores={failure.scores} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span className={`badge ${failure.retried ? "badge-orange" : "badge-grey"}`}>
            {failure.retried ? `🔁 Self-heal retried (${failure.retry_count} attempts)` : "No retry"}
          </span>
        </div>
      </div>

      <div style={{
        background: "var(--orange-bg)", borderBottom: "1px solid var(--border)",
        padding: "10px 18px", fontSize: 13, color: "var(--orange)", fontWeight: 600,
      }}>
        💡 Likely Reason: <span style={{ color: "var(--fg2)", fontWeight: 400 }}>{failure.likely_reason}</span>
      </div>

      {failure.retrieved_chunks?.length > 0 && (
        <div style={{ padding: "14px 18px" }}>
          <button
            onClick={() => setChunksOpen(o => !o)}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 8,
              padding: "6px 12px", fontSize: 12, color: "var(--fg3)", marginBottom: 8,
            }}
          >
            {chunksOpen ? "Hide" : "Show"} retrieved chunks ({failure.retrieved_chunks.length}) {chunksOpen ? "▲" : "▼"}
          </button>
          {chunksOpen && failure.retrieved_chunks.map((chunk, i) => (
            <ChunkItem key={i} chunk={chunk} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
