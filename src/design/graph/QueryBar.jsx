import React from "react";

export function QueryBar({ value, onChange, result }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--surface-raised)", borderRadius: "var(--radius-neu-sm)", padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "13px", boxShadow: "var(--shadow-neu-inset)" }}>
        <span style={{ color: "var(--accent-primary)" }}>$</span>
        <span style={{ color: "var(--text-secondary)" }}>skein query</span>
        <input
          value={value}
          onChange={onChange}
          placeholder='"why postgres?"'
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}
        />
      </div>
      {result && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-primary)", paddingLeft: "4px" }}>→ {result}</div>
      )}
    </div>
  );
}
