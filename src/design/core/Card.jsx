import React from "react";

export function Card({ children, padding = "20px" }) {
  return (
    <div style={{
      background: "var(--surface-raised)", borderRadius: "var(--radius-neu-lg)", padding,
      boxShadow: "var(--shadow-neu-raised)",
    }}>
      {children}
    </div>
  );
}
