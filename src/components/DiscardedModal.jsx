import React, { useState } from "react";

export function DiscardedModal({ open, onClose, discardedClaims, onRestore, onPermanentlyDelete }) {
  const [selected, setSelected] = useState(new Set());

  if (!open) return null;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(discardedClaims.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleRestore() {
    await onRestore(Array.from(selected));
    setSelected(new Set());
  }

  async function handleDelete() {
    const n = selected.size;
    if (!window.confirm(`Permanently delete ${n} claim${n === 1 ? "" : "s"}? This is the one action in Skein that actually can't be undone.`)) {
      return;
    }
    await onPermanentlyDelete(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={titleStyle}>Discarded</span>
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button>
        </div>

        {discardedClaims.length === 0 ? (
          <div style={emptyStyle}>
            Nothing discarded right now. Discard a claim from its mini-window, or
            an entire cluster from the sidebar's trash icon, and it shows up here
            first — restorable, or permanently deletable, but never silently gone.
          </div>
        ) : (
          <>
            <div style={{ font: "var(--text-body-sm)", color: "var(--text-muted)", marginBottom: "12px" }}>
              {discardedClaims.length} claim{discardedClaims.length === 1 ? "" : "s"}
              {selected.size > 0 ? ` · ${selected.size} selected` : ""}
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <button onClick={selectAll} style={linkButtonStyle}>select all</button>
              {selected.size > 0 && <button onClick={clearSelection} style={linkButtonStyle}>clear selection</button>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "360px", overflowY: "auto", marginBottom: "16px" }}>
              {discardedClaims.map((c) => (
                <label key={c.id} style={rowStyle}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} style={{ marginTop: "3px", flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)" }}>{c.topic}</div>
                    <div style={{ font: "var(--text-body-sm)", color: "var(--text-secondary)" }}>{c.label || c.text}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleRestore} disabled={selected.size === 0} style={{ ...actionButtonStyle, opacity: selected.size === 0 ? 0.5 : 1 }}>
                Restore {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
              <button onClick={handleDelete} disabled={selected.size === 0} style={{ ...dangerButtonStyle, opacity: selected.size === 0 ? 0.5 : 1 }}>
                Delete permanently {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const panelStyle = {
  width: "480px",
  maxWidth: "calc(100vw - 40px)",
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg)",
  padding: "24px",
};

const titleStyle = {
  font: "var(--text-subheading)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-ui)",
};

const closeButtonStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "18px",
  lineHeight: 1,
  cursor: "pointer",
  padding: "4px",
};

const emptyStyle = {
  font: "var(--text-body-sm)",
  color: "var(--text-muted)",
  lineHeight: 1.6,
  padding: "12px 0",
};

const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--text-muted)",
  font: "var(--text-mono-sm)",
  cursor: "pointer",
  textDecoration: "underline",
};

const rowStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "8px 10px",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};

const actionButtonStyle = {
  flex: 1,
  padding: "9px 0",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-sunken)",
  color: "var(--text-primary)",
  font: "var(--text-body-sm)",
  cursor: "pointer",
};

const dangerButtonStyle = {
  ...actionButtonStyle,
  color: "var(--color-bronze)",
  borderColor: "var(--color-bronze)",
};
