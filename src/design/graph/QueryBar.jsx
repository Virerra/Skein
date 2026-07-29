import React from "react";

// Submit-driven (Enter key), not live-as-you-type. This used to fire
// on every keystroke, which was fine when it was instant local keyword
// matching -- now that it triggers a real embedding call plus an LLM
// synthesis call, running it on every character would be wasteful and
// slow, and there's no reason to search on a half-typed question.
export function QueryBar({ value, onChange, onSubmit, busy }) {
  function handleKeyDown(e) {
    if (e.key === "Enter" && !busy) onSubmit?.();
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--accent-primary)" }}>$</span>
      <span style={{ color: "var(--text-secondary)" }}>skein query</span>
      <input
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={busy}
        placeholder='"why postgres?" — press Enter'
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          fontSize: "13px",
        }}
      />
      {busy && <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>searching…</span>}
    </div>
  );
}
