import { useState, useRef } from "react";
import { uploadPDF } from "../api";

export default function UploadZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file || !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await uploadPDF(file);
      onUploaded(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border2)"}`,
          borderRadius: "var(--radius)",
          padding: "20px 14px",
          textAlign: "center",
          background: dragging ? "var(--accent-bg)" : "var(--surface)",
          cursor: "pointer",
          transition: "all .15s",
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {loading ? (
          <span style={{ color: "var(--accent)", fontSize: 13 }}>⏳ Ingesting…</span>
        ) : (
          <>
            <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
              Drop a PDF here
            </div>
            <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>
              or click to browse
            </div>
          </>
        )}
      </div>
      {error && (
        <p style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
