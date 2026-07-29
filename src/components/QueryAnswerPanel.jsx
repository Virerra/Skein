import React from "react";

// Renders inline [n] citation markers in the accent color; everything
// else passes through as plain text untouched.
function AnswerText({ text }) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <span key={i} style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export function QueryAnswerPanel({ queryText, busy, error, result, onOpenSource }) {
  if (busy) {
    return <div style={hintStyle}>Searching your claims for "{queryText}"…</div>;
  }

  if (error) {
    return <div style={errorStyle}>{error}</div>;
  }

  if (!result) {
    return (
      <div style={hintStyle}>
        Ask something in the query bar below the graph, then press Enter.
        Answers come only from your own claims, not general knowledge — if
        nothing's relevant yet, it says so instead of guessing.
      </div>
    );
  }

  if (!result.matched) {
    return <div style={hintStyle}>No claims to search yet — add a transcript first.</div>;
  }

  return (
    <div>
      <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", marginBottom: "6px" }}>
        "{queryText}"
      </div>
      <div style={{ font: "var(--text-body)", color: "var(--text-primary)", lineHeight: 1.6, marginBottom: "20px" }}>
        <AnswerText text={result.answer || "No answer generated."} />
      </div>

      {result.sources.length > 0 && (
        <div>
          <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px" }}>
            Sources
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.sources.map((c, i) => {
              const cited = result.citedIndices.includes(i + 1);
              return (
                <div
                  key={c.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onOpenSource(c.id)}
                  style={{ ...sourceRowStyle, opacity: cited ? 1 : 0.55 }}
                >
                  <div style={{ font: "var(--text-mono-sm)", color: "var(--accent-primary)", marginBottom: "2px" }}>
                    [{i + 1}] {c.topic}
                  </div>
                  {c.label && (
                    <div style={{ font: "var(--text-body-sm)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                      {c.label}
                    </div>
                  )}
                  <div style={{ font: "var(--text-body-sm)", color: "var(--text-secondary)" }}>{c.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const hintStyle = {
  font: "var(--text-body-sm)",
  color: "var(--text-muted)",
  lineHeight: 1.6,
};

const errorStyle = {
  font: "var(--text-mono-sm)",
  color: "var(--color-bronze)",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
};

const sourceRowStyle = {
  padding: "8px 10px",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
