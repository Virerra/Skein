import React from "react";

export function Input({ placeholder, value, onChange, mono = false, prompt }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-raised)", borderRadius: "var(--radius-neu-sm)", padding: "12px 16px", boxShadow: "var(--shadow-neu-inset)" }}>
      {prompt && <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)", fontSize: "13px" }}>{prompt}</span>}
      <input
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: "var(--text-primary)",
          font: mono ? "var(--text-mono)" : "var(--text-body)",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
        }}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
