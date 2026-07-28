import React from "react";

const statusStyles = {
  active: { color: "var(--accent-primary)", border: "1px solid var(--accent-primary)" },
  superseded: { color: "var(--accent-superseded)", border: "1px dashed var(--accent-superseded)" },
  correction: { color: "var(--accent-correction)", border: "1px solid var(--accent-correction)" },
};

export function Badge({ status = "active", children }) {
  const s = statusStyles[status] || statusStyles.active;
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "var(--tracking-mono)",
      padding: "3px 8px", borderRadius: "var(--radius-sm)", ...s,
      textTransform: "uppercase", display: "inline-block",
    }}>
      [{children}]
    </span>
  );
}
