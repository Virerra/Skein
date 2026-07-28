import React from "react";

export function ClusterFilter({ clusters, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {clusters.map((c) => {
        const on = selected.includes(c.id);
        return (
          <label key={c.id} style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px",
            borderRadius: "var(--radius-neu-sm)", cursor: "pointer",
            background: "var(--surface-raised)",
            boxShadow: on ? "var(--shadow-neu-inset-sm)" : "none",
            transition: `box-shadow var(--duration-fast) var(--ease-standard)`,
          }}>
            <input type="checkbox" checked={on} onChange={() => onToggle(c.id)} style={{ accentColor: c.color }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>{c.count}</span>
          </label>
        );
      })}
    </div>
  );
}
