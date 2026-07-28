import React from "react";

const ringColor = { active: "var(--accent-primary)", superseded: "var(--accent-superseded)", correction: "var(--accent-correction)" };
export function Knot({ label, status = "active", size = 56 }) {
  const dead = status === "superseded";
  const grad = status === "correction" ? "url(#skeinGBronze)" : dead ? "url(#skeinGDead)" : "url(#skeinGGold)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <svg width={size * 1.6} height={size * 1.5} viewBox={`0 0 ${size * 1.6} ${size * 1.5}`} style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="skeinGGold" cx="35%" cy="32%"><stop offset="0%" stopColor="#c4b47f" /><stop offset="55%" stopColor="#ad9564" /><stop offset="100%" stopColor="#54452e" /></radialGradient>
          <radialGradient id="skeinGBronze" cx="35%" cy="32%"><stop offset="0%" stopColor="#a58a66" /><stop offset="55%" stopColor="#8b7048" /><stop offset="100%" stopColor="#413320" /></radialGradient>
          <radialGradient id="skeinGDead" cx="40%" cy="35%"><stop offset="0%" stopColor="#5c6870" /><stop offset="100%" stopColor="#3d454b" /></radialGradient>
        </defs>
        {dead ? (
          <g transform={`translate(${size * 0.8}, ${size * 0.75})`}>
            <ellipse cx="0" cy={size * 0.12} rx={size * 0.42} ry={size * 0.16} fill="rgba(0,0,0,.35)" />
            <circle r={size * 0.32} fill={grad} opacity="0.85" />
            <circle r={size * 0.32} fill="none" stroke="#2b2b2b" strokeWidth="1.5" opacity="0.6" />
          </g>
        ) : (
          <g transform={`translate(${size * 0.8}, ${size * 0.65})`}>
            <ellipse cx="0" cy={size * 0.5} rx={size * 0.55} ry={size * 0.2} fill="rgba(0,0,0,.4)" style={{ filter: "blur(3px)" }} />
            <circle r={size * 0.42} fill={grad} />
          </g>
        )}
      </svg>
      {label && <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-secondary)" }}>{label}</span>}
    </div>
  );
}
