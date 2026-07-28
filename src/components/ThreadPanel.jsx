import React, { useState } from "react";
import { Badge } from "../design/core/Badge";
import { Button } from "../design/core/Button";

function badgeStatus(claim) {
  if (claim.status === "discarded") return "discarded";
  if (claim.status === "correction") return "correction";
  if (claim.status === "superseded") return "superseded";
  return "active";
}

function badgeLabel(claim, isLast) {
  if (claim.status === "discarded") return "DISCARDED";
  if (claim.status === "superseded") return "SUPERSEDED";
  if (claim.status === "correction") return isLast ? "CORRECTION · CURRENT" : "CORRECTION";
  return isLast ? "ACTIVE · CURRENT" : "ACTIVE";
}

const fieldStyle = {
  width: "100%",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 8px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  outline: "none",
};

function ClaimEditForm({ claim, onSave, onCancel }) {
  const [text, setText] = useState(claim.text);
  const [topic, setTopic] = useState(claim.topic);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "6px" }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
      <input value={topic} onChange={(e) => setTopic(e.target.value)} style={fieldStyle} placeholder="topic" />
      <div style={{ display: "flex", gap: "8px" }}>
        <Button size="sm" variant="primary" onClick={() => onSave({ text: text.trim(), topic: topic.trim().toLowerCase() })} disabled={!text.trim() || !topic.trim()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function ThreadPanel({ chain, topic, onEdit, onDiscard }) {
  const [editingId, setEditingId] = useState(null);

  if (!chain || chain.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: "13px" }}>
        Select a claim on the graph, or run a query, to see its chain.
      </div>
    );
  }

  return (
    <div>
      <div style={{ font: "var(--text-heading)", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        {topic}
      </div>
      <div style={{ font: "var(--text-body-sm)", color: "var(--text-muted)", marginBottom: "18px" }}>
        Decision chain · {chain.length} claim{chain.length === 1 ? "" : "s"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {chain.map((c, i) => {
          const isLast = i === chain.length - 1;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: "14px" }}>
              <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", marginBottom: "3px" }}>
                {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {c.sourceChat}
              </div>

              {isEditing ? (
                <ClaimEditForm
                  claim={c}
                  onCancel={() => setEditingId(null)}
                  onSave={(updates) => {
                    onEdit(c.id, updates);
                    setEditingId(null);
                  }}
                />
              ) : (
                <div
                  style={{
                    font: "var(--text-body-sm)",
                    color: c.status === "superseded" || c.status === "discarded" ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: c.status === "superseded" ? "line-through" : "none",
                    textDecorationColor: "var(--accent-superseded)",
                    marginBottom: "6px",
                  }}
                >
                  {c.text}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <Badge status={badgeStatus(c)}>{badgeLabel(c, isLast)}</Badge>
                {!isEditing && onEdit && c.status !== "discarded" && (
                  <button onClick={() => setEditingId(c.id)} style={linkButtonStyle}>edit</button>
                )}
                {onDiscard && c.status !== "discarded" && (
                  <button
                    onClick={() => {
                      if (window.confirm("Discard this claim? It'll disappear from the graph but stay visible in this chain's history.")) {
                        onDiscard(c.id);
                      }
                    }}
                    style={linkButtonStyle}
                  >
                    discard
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--text-muted)",
  font: "var(--text-mono-sm)",
  cursor: "pointer",
  textDecoration: "underline",
};
