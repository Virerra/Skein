import React, { useEffect, useRef, useState } from "react";

export function WorkspaceSwitcher({ workspaces, activeId, onSwitch, onCreate, onRename, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = workspaces.find((w) => w.id === activeId) || workspaces[0];

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleCreate() {
    const name = window.prompt("Name for the new workspace:");
    if (name && name.trim()) onCreate(name.trim());
    setOpen(false);
  }

  function handleRename() {
    const name = window.prompt("Rename this workspace:", active.name);
    if (name && name.trim()) onRename(active.id, name.trim());
    setOpen(false);
  }

  function handleDelete() {
    if (workspaces.length <= 1) return;
    if (window.confirm(`Delete "${active.name}"? Every claim, relation, and setting in it is gone permanently -- this isn't a discard, there's no restoring it.`)) {
      onDelete(active.id);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={triggerStyle}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.name}</span>
        <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div style={dropdownStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "8px" }}>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  onSwitch(w.id);
                  setOpen(false);
                }}
                style={{ ...rowStyle, color: w.id === activeId ? "var(--accent-primary)" : "var(--text-primary)" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</span>
                {w.id === activeId && <span>✓</span>}
              </button>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <button onClick={handleCreate} style={actionRowStyle}>+ New workspace</button>
            <button onClick={handleRename} style={actionRowStyle}>Rename "{active.name}"</button>
            {workspaces.length > 1 && (
              <button onClick={handleDelete} style={{ ...actionRowStyle, color: "var(--color-bronze)" }}>
                Delete "{active.name}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const triggerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  width: "100%",
  padding: "6px 8px",
  background: "var(--surface-sunken)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-primary)",
  font: "var(--text-body-sm)",
  cursor: "pointer",
  textAlign: "left",
};

const dropdownStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  width: "220px",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "8px",
  zIndex: 150,
  boxShadow: "var(--shadow-md)",
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  width: "100%",
  padding: "6px 8px",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-sm)",
  font: "var(--text-body-sm)",
  cursor: "pointer",
  textAlign: "left",
};

const actionRowStyle = {
  ...rowStyle,
  color: "var(--text-muted)",
  font: "var(--text-mono-sm)",
};
