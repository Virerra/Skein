import React from "react";
import { NeumorphicShadow } from "./neumorphism";

export function Button({ variant = "primary", size = "md", disabled, fullWidth, children, onClick }) {
  const [pressed, setPressed] = React.useState(false);
  const pad = size === "sm" ? "6px 14px" : size === "lg" ? "13px 26px" : "10px 18px";
  const font = size === "sm" ? "var(--text-body-sm)" : "var(--text-body)";
  const base = {
    position: "relative",
    fontFamily: "var(--font-ui)",
    font,
    padding: pad,
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    border: "none",
    transition: `transform var(--duration-fast) var(--ease-standard), filter var(--duration-fast) var(--ease-standard)`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: fullWidth ? "center" : "flex-start",
    gap: "8px",
    width: fullWidth ? "100%" : undefined,
    transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
  };
  const variants = {
    primary: { background: "var(--gradient-primary)", color: "var(--text-on-accent)" },
    secondary: { background: "var(--surface-raised)", color: "var(--text-primary)" },
    // Gold-tinted, theme-aware (color-mix blends whatever the current
    // theme's tokens resolve to, so this works in light mode too, not
    // just dark) -- a deliberately softer accent than "primary", for
    // actions that trigger an LLM call (Relabel, Categorize, Suggest
    // relations) as opposed to plain local/manual ones. The color
    // itself is the signal: gold means "this calls a model."
    accent: {
      background: "color-mix(in srgb, var(--color-gold) 16%, var(--surface-raised))",
      color: "var(--color-gold)",
      border: "1px solid color-mix(in srgb, var(--color-gold) 35%, transparent)",
    },
    ghost: { background: "transparent", color: "var(--text-secondary)" },
    correction: { background: "var(--gradient-correction)", color: "var(--text-on-accent)" },
  };
  return (
    <button
      style={{ ...base, ...variants[variant] }}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={(e) => { setPressed(false); if (!disabled) e.currentTarget.style.filter = "none"; }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
    >
      <NeumorphicShadow pressed={pressed} showRaised={variant !== "ghost"} radius="var(--radius-md)" />
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "8px" }}>{children}</span>
    </button>
  );
}
