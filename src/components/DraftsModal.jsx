import React, { useState } from "react";
import { getDrafts, deleteDraft } from "../lib/drafts";

// Self-contained, like IngestPanel's own draft handling -- loads fresh
// from localStorage on mount, which happens every time this opens
// since Modal fully unmounts its children on close.
export function DraftsModal({ open, onClose, onOpenDraft }) {
  const [drafts, setDrafts] = useState(() => getDrafts());

  function handleDelete(id, e) {
    e.stopPropagation();
    deleteDraft(id);
    setDrafts(getDrafts());
  }

  if (!open) return null;

  return (
    <ModalShell onClose={onClose} title="Drafts">
      {drafts.length === 0 ? (
        <div style={emptyStyle}>
          No saved drafts. Anything you paste into "Add transcript" is saved here automatically as you type, so it's never lost to a failed extraction.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {drafts.map((d) => (
            <div key={d.id} onClick={() => onOpenDraft(d.id)} style={rowStyle}>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={titleStyle}>{d.sourceChat || "untitled"}</div>
                <div style={metaStyle}>
                  {new Date(d.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {d.transcript.length.toLocaleString()} characters
                </div>
                <div style={previewStyle}>
                  {d.transcript.slice(0, 160)}{d.transcript.length > 160 ? "…" : ""}
                </div>
              </div>
              <button onClick={(e) => handleDelete(d.id, e)} style={deleteStyle} aria-label="Delete draft">×</button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// Local shell rather than importing the shared Modal, only because this
// needs a wider body for transcript previews -- otherwise identical.
function ModalShell({ onClose, title, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "560px", maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)", overflowY: "auto", background: "var(--surface-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", padding: "24px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ font: "var(--text-subheading)", color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "4px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyStyle = {
  font: "var(--text-body-sm)",
  color: "var(--text-muted)",
  padding: "20px 0",
  textAlign: "center",
};

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "10px 12px",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};

const titleStyle = {
  font: "var(--text-body)",
  color: "var(--text-primary)",
  marginBottom: "2px",
};

const metaStyle = {
  font: "var(--text-mono-sm)",
  color: "var(--text-muted)",
  marginBottom: "6px",
};

const previewStyle = {
  font: "var(--text-body-sm)",
  color: "var(--text-secondary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
};

const deleteStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "16px",
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};
