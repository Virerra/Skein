import React from "react";

export function Thread({ width = 220, height = 60, status = "active" }) {
  const active = status === "active";
  const color = status === "correction" ? "var(--accent-correction)" : active ? "var(--accent-primary)" : "var(--accent-superseded)";
  const sag = Math.min(width * 0.28, height * 1.6);
  const dRest = `M4,${height * 0.3} C${width * 0.33},${height * 0.3 + sag} ${width * 0.66},${height * 0.3 + sag} ${width - 4},${height * 0.3}`;
  const dSway = `M4,${height * 0.3} C${width * 0.33},${height * 0.3 + sag * 1.3} ${width * 0.66},${height * 0.3 + sag * 0.7} ${width - 4},${height * 0.3}`;
  return (
    <svg width={width} height={height + sag} style={{ overflow: "visible" }}>
      <path d={dRest} fill="none" stroke={color}
        strokeWidth={active ? 2.5 : 2}
        strokeDasharray={active ? "0" : "5 6"}
        opacity={active ? 1 : 0.7}
        style={active ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}
      >
        {active && <animate attributeName="d" values={`${dRest};${dSway};${dRest}`} dur="6s" repeatCount="indefinite" calcMode="spline" keySplines=".45,0,.55,1;.45,0,.55,1" />}
      </path>
    </svg>
  );
}
