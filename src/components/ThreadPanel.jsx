import React from "react";
import { Badge } from "../design/core/Badge";

function badgeStatus(claim) {
  if (claim.status === "correction") return "correction";
  if (claim.status === "superseded") return "superseded";
  return "active";
}

function badgeLabel(claim, isLast) {
  if (claim.status === "superseded") return "SUPERSEDED";
  if (claim.status === "correction") return isLast ? "CORRECTION · CURRENT" : "CORRECTION";
  return isLast ? "ACTIVE · CURRENT" : "ACTIVE";
}

export function ThreadPanel({ chain, topic }) {
  if (!chain || chain.length === 0) {
    return (
      <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", fontSize: "13px" }}>
        Select a claim on the graph, or run a query, to see its chain.
      </div>
    );
  }

  return (
    <div>
      <div style={{ font: "var(--text-heading)", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
        {topic}
      </div>
      <div style={{ font: "var(--text-body-sm)", color: "var(--text-muted)", marginBottom: "18px" }}>
        Decision chain · {chain.length} claim{chain.length === 1 ? "" : "s"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {chain.map((c, i) => {
          const isLast = i === chain.length - 1;
          return (
            <div key={c.id} style={{ borderLeft: "2px solid var(--border-default)", paddingLeft: "14px" }}>
              <div style={{ font: "var(--text-mono-sm)", color: "var(--text-muted)", marginBottom: "3px" }}>
                {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {c.sourceChat}
              </div>
              <div
                style={{
                  font: "var(--text-body-sm)",
                  color: c.status === "superseded" ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: c.status === "superseded" ? "line-through" : "none",
                  textDecorationColor: "var(--accent-superseded)",
                  marginBottom: "6px",
                }}
              >
                {c.text}
              </div>
              <Badge status={badgeStatus(c)}>{badgeLabel(c, isLast)}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
