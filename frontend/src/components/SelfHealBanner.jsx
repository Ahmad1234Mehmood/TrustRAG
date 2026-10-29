import { useState } from "react";

export default function SelfHealBanner({ retried, retryHistory }) {
  const [open, setOpen] = useState(false);
  if (!retried) return null;

  return (
    <div className="chat-selfheal">
      <div className="chat-selfheal-bar">
        <span>⚡ Self-healed — low faithfulness detected, retried with new query</span>
        <button onClick={() => setOpen(o => !o)}>
          {open ? "Hide" : "View"} log
        </button>
      </div>

      {open && (
        <div className="chat-selfheal-log">
          {retryHistory.map((step) => (
            <div key={step.attempt} className="chat-selfheal-step">
              <div className="chat-selfheal-step-head">
                <span>Attempt {step.attempt}</span>
                <span className={`chat-score-pill ${step.faithfulness >= 0.6 ? "good" : "poor"}`}>
                  Faithfulness {step.faithfulness.toFixed(2)}
                </span>
              </div>
              <div className="chat-selfheal-step-query">
                Query: <em>"{step.query_used}"</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
