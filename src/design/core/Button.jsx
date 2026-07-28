import React from "react";

export function Button({ variant = "primary", size = "md", disabled, children, onClick }) {
  const [pressed, setPressed] = React.useState(false);
  const pad = size === "sm" ? "6px 14px" : size === "lg" ? "13px 26px" : "10px 18px";
  const font = size === "sm" ? "var(--text-body-sm)" : "var(--text-body)";
  const neumorphic = variant === "secondary" || variant === "ghost";
  const base = {
    fontFamily: "var(--font-ui)",
    font,
    padding: pad,
    borderRadius: "var(--radius-neu-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: `all var(--duration-fast) var(--ease-standard)`,
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
  };
  const variants = {
    primary: { background: "var(--gradient-primary)", color: "var(--text-on-accent)", boxShadow: pressed ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-raised-sm)" },
    secondary: { background: "var(--surface-raised)", color: "var(--text-primary)", boxShadow: pressed ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-raised-sm)" },
    ghost: { background: "transparent", color: "var(--text-secondary)", boxShadow: pressed ? "var(--shadow-neu-inset-sm)" : "none" },
    correction: { background: "var(--gradient-correction)", color: "var(--text-on-accent)", boxShadow: pressed ? "var(--shadow-neu-inset-sm)" : "var(--shadow-neu-raised-sm)" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={(e) => { setPressed(false); if (!disabled && variant === "primary") e.currentTarget.style.filter = "none"; }}
      onMouseEnter={(e) => { if (!disabled && variant === "primary") e.currentTarget.style.filter = "brightness(1.08)"; }}
    >
      {children}
    </button>
  );
}
