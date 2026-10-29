/** Thin wrapper around the FastAPI backend. */
const BASE = "/api";

export async function uploadPDF(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
  return res.json();           // { doc_id, filename, chunks }
}

export async function listDocs() {
  const res = await fetch(`${BASE}/docs`);
  if (!res.ok) throw new Error("Failed to list docs");
  return res.json();           // [{ doc_id, filename }, ...]
}

export async function askQuestion(question, docId = null) {
  const res = await fetch(`${BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_id: docId }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Ask failed");
  return res.json();
  // { answer, citations, scores, retried, retry_history, doc_id }
}

export async function listMuseum() {
  const res = await fetch(`${BASE}/museum`);
  if (!res.ok) throw new Error("Failed to load museum");
  return res.json();           // [{ name, title, query }, ...]
}

export async function runExhibit(name) {
  const res = await fetch(`${BASE}/museum/${name}`);
  if (!res.ok) throw new Error((await res.json()).detail || "Exhibit failed");
  return res.json();
}
