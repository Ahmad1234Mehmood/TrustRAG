import { useState, useRef, useEffect } from "react";
import { askQuestion } from "../api";
import SelfHealBanner from "./SelfHealBanner";
import CitationPanel from "./CitationPanel";
import "./ChatWindow.css";

function scoreTier(v) {
  if (v >= 0.8) return "good";
  if (v >= 0.6) return "fair";
  return "poor";
}

function ChatScorePills({ scores }) {
  if (!scores) return null;
  return (
    <div className="chat-score-pills">
      <span className={`chat-score-pill ${scoreTier(scores.faithfulness)}`}>
        Faithfulness {scores.faithfulness.toFixed(2)}
      </span>
      <span className={`chat-score-pill ${scoreTier(scores.answer_relevancy)}`}>
        Relevance {scores.answer_relevancy.toFixed(2)}
      </span>
    </div>
  );
}

function Message({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="chat-row chat-row-end">
        <div className="chat-bubble-user">{msg.text}</div>
      </div>
    );
  }

  if (msg.role === "thinking") {
    return (
      <div className="chat-row">
        <div className="chat-avatar">🤖</div>
        <div className="chat-bubble-ai chat-bubble-thinking">
          <span className="thinking-dots">Thinking</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-row">
      <div className="chat-avatar">🤖</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="chat-bubble-ai">{msg.text}</div>
        <ChatScorePills scores={msg.scores} />
        {msg.retried && (
          <SelfHealBanner retried={msg.retried} retryHistory={msg.retryHistory} />
        )}
        {msg.citations?.length > 0 && (
          <CitationPanel citations={msg.citations} />
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ selectedDoc, messages, setMessages }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setError("");
  }, [selectedDoc?.doc_id]);

  async function handleSend(e) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setError("");

    setMessages(prev => [...prev, { id: Date.now(), role: "user", text: q }]);
    const thinkId = Date.now() + 1;
    setMessages(prev => [...prev, { id: thinkId, role: "thinking" }]);
    setLoading(true);

    try {
      const data = await askQuestion(q, selectedDoc?.doc_id ?? null);
      setMessages(prev => [
        ...prev.filter(m => m.id !== thinkId),
        {
          id: Date.now(),
          role: "assistant",
          text: data.answer,
          scores: data.scores,
          citations: data.citations,
          retried: data.retried,
          retryHistory: data.retry_history,
        },
      ]);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== thinkId));
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const placeholder = selectedDoc
    ? `Ask about "${selectedDoc.filename}"…`
    : "Ask across all documents…";

  return (
    <div className="chat-window">
      {messages.length > 0 && (
        <div className="chat-clear-row">
          <button className="chat-clear-btn" onClick={() => setMessages([])}>
            🗑️ Clear
          </button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div style={{ fontSize: 40 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg2)" }}>
              {selectedDoc ? `"${selectedDoc.filename}" loaded` : "Upload a PDF to begin"}
            </div>
            <div style={{ fontSize: 13, maxWidth: 300 }}>
              {selectedDoc
                ? "Ask anything — citations, scores, and self-healing are automatic"
                : "Or ask across all documents without selecting one"}
            </div>
          </div>
        ) : (
          messages.map(msg => <Message key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="chat-banner error">❌ {error}</div>
      )}

      {messages.length > 20 && (
        <div className="chat-banner warning">
          ⚠️ Chat is getting long — consider clearing it to keep responses fast.
        </div>
      )}

      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim() || loading}>
          Send ↑
        </button>
      </form>
    </div>
  );
}
