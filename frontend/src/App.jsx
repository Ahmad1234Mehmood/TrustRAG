import { useState, useEffect } from "react";
import { listDocs } from "./api";
import UploadZone from "./components/UploadZone";
import ChatWindow from "./components/ChatWindow";
import MuseumPage from "./components/Museum/MuseumPage";

const TABS = [
  { id: "chat",   label: "💬 Chat",   title: "Chat with Documents" },
  { id: "museum", label: "🏛️ Museum", title: "Failure Mode Museum" },
];

function ThemeToggle({ theme, setTheme }) {
  const next = theme === "light" ? "dark" : "light";
  return (
    <button
      onClick={() => setTheme(next)}
      title={`Switch to ${next} mode`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 16,
        color: "var(--fg2)",
        lineHeight: 1,
      }}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

function Sidebar({ docs, selectedDoc, onSelectDoc, onUploaded }) {
  return (
    <div style={{
      width: 240,
      flexShrink: 0,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>🔐</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--fg)", letterSpacing: -.3 }}>
              TrustRAG
            </div>
            <div style={{ fontSize: 10, color: "var(--fg3)", fontWeight: 600, letterSpacing: .5, textTransform: "uppercase" }}>
              Cite · Score · Self-Heal
            </div>
          </div>
        </div>
      </div>

      {/* Upload */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Upload PDF
        </div>
        <UploadZone onUploaded={onUploaded} />
      </div>

      {/* Document list */}
      <div style={{ padding: "10px 14px", flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
          Documents ({docs.length})
        </div>

        {docs.length === 0 ? (
          <div style={{ color: "var(--fg3)", fontSize: 12, padding: "8px 0" }}>
            No documents yet. Upload a PDF to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* "All docs" option */}
            <button
              onClick={() => onSelectDoc(null)}
              style={{
                background: !selectedDoc ? "var(--accent-bg)" : "transparent",
                border: `1px solid ${!selectedDoc ? "var(--accent-b)" : "transparent"}`,
                borderRadius: 8,
                padding: "7px 10px",
                textAlign: "left",
                fontSize: 12,
                color: !selectedDoc ? "var(--accent)" : "var(--fg2)",
                fontWeight: !selectedDoc ? 600 : 400,
              }}
            >
              🌐 All documents
            </button>

            {docs.map(doc => {
              const active = selectedDoc?.doc_id === doc.doc_id;
              return (
                <button
                  key={doc.doc_id}
                  onClick={() => onSelectDoc(doc)}
                  title={doc.filename}
                  style={{
                    background: active ? "var(--accent-bg)" : "transparent",
                    border: `1px solid ${active ? "var(--accent-b)" : "transparent"}`,
                    borderRadius: 8,
                    padding: "7px 10px",
                    textAlign: "left",
                    fontSize: 12,
                    color: active ? "var(--accent)" : "var(--fg2)",
                    fontWeight: active ? 600 : 400,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  📄 {doc.filename}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid var(--border)",
        fontSize: 11,
        color: "var(--fg3)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}>
        <span>Hybrid retrieval · RAGAs eval</span>
        <span>Self-healing retry loop</span>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("trustrag-theme") ?? "system"; } catch { return "system"; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    try { localStorage.setItem("trustrag-theme", theme); } catch {}
  }, [theme]);

  // Load docs on mount
  useEffect(() => {
    listDocs()
      .then(setDocs)
      .catch(() => {});
  }, []);

  function handleSelectDoc(doc) {
    if ((doc?.doc_id ?? null) !== (selectedDoc?.doc_id ?? null)) {
      setMessages([]);
    }
    setSelectedDoc(doc);
  }

  function handleUploaded(result) {
    const newDoc = { doc_id: result.doc_id, filename: result.filename };
    setDocs(prev => {
      const exists = prev.find(d => d.doc_id === newDoc.doc_id);
      return exists ? prev : [newDoc, ...prev];
    });
    setMessages([]);
    setSelectedDoc(newDoc);
    setTab("chat");
  }

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : (t === "dark" ? "system" : "light"));

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg)",
    }}>
      {/* Top nav */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        height: 52,
        gap: 8,
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "5px 9px",
            fontSize: 15,
            color: "var(--fg3)",
            lineHeight: 1,
          }}
          title="Toggle sidebar"
        >
          ☰
        </button>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--fg2)",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: 13,
                transition: "background .15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <ThemeToggle theme={theme === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : theme}
          setTheme={toggleTheme}
        />
      </header>

      {/* Body */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }}>
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            docs={docs}
            selectedDoc={selectedDoc}
            onSelectDoc={handleSelectDoc}
            onUploaded={handleUploaded}
          />
        )}

        {/* Main content */}
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 20,
          gap: 0,
        }}>
          {tab === "chat" ? (
            <ChatWindow selectedDoc={selectedDoc} messages={messages} setMessages={setMessages} />
          ) : (
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
              <MuseumPage messages={messages} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
