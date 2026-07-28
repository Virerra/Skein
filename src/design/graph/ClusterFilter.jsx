import React from "react";
import { NeumorphicShadow } from "../core/neumorphism";

export function ClusterFilter({ clusters, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {clusters.map((c) => {
        const on = selected.includes(c.id);
        return (
          <label key={c.id} style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            background: "var(--surface-raised)",
          }}>
            <NeumorphicShadow pressed={on} radius="var(--radius-md)" />
            <input type="checkbox" checked={on} onChange={() => onToggle(c.id)} style={{ position: "relative", accentColor: c.color }} />
            <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <span style={{ position: "relative", fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--text-primary)", flex: 1 }}>{c.name}</span>
            <span style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>{c.count}</span>
          </label>
        );
      })}
    </div>
  );
}
