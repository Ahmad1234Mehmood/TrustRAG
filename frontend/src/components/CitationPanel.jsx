import { useState } from "react";

export default function CitationPanel({ citations }) {
  const [open, setOpen] = useState(false);
  if (!citations?.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        📎 {citations.length} source{citations.length !== 1 ? "s" : ""} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {citations.map((c) => (
            <div
              key={c.index}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--accent)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {c.index}
                </span>
                <span style={{ fontWeight: 600, color: "var(--fg)", fontSize: 12 }}>
                  {c.source}
                </span>
                <span className="badge badge-grey">Page {c.page}</span>
              </div>
              <p style={{
                color: "var(--fg2)",
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
                borderLeft: "3px solid var(--accent-b)",
                paddingLeft: 10,
              }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
