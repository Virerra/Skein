import React from "react";

export function Card({ children, padding = "20px" }) {
  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      padding,
    }}>
      {children}
    </div>
  );
}
