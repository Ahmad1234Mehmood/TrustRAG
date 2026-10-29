export default function ScoreBadge({ scores }) {
  if (!scores) return null;

  function tier(v) {
    if (v >= 0.8) return { label: "Good",    cls: "badge-green",  icon: "✅" };
    if (v >= 0.6) return { label: "Fair",    cls: "badge-orange", icon: "⚠️" };
    return               { label: "Low",     cls: "badge-red",    icon: "❌" };
  }

  const f = tier(scores.faithfulness);
  const r = tier(scores.answer_relevancy);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <span className={`badge ${f.cls}`} title="Did the AI stick to the document?">
        {f.icon} Faithfulness {scores.faithfulness.toFixed(2)}
      </span>
      <span className={`badge ${r.cls}`} title="Did the answer address the question?">
        {r.icon} Relevance {scores.answer_relevancy.toFixed(2)}
      </span>
    </div>
  );
}
