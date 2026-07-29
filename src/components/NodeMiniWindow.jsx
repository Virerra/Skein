import React, { useEffect, useRef } from "react";
import { ThreadPanel } from "./ThreadPanel";

const WIDTH = 340;
const MAX_HEIGHT = 420;

export function NodeMiniWindow({ chain, topic, anchor, onClose, onEdit, onDiscard, onLocate }) {
  const ref = useRef(null);

  useEffect(() => {
    function handlePointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!chain) return null;

  return (
    <div ref={ref} style={{ ...containerStyle, ...computePosition(anchor) }}>
      <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>×</button>
      {onLocate && (
        <button onClick={onLocate} style={locateButtonStyle}>
          ◎ Locate on graph
        </button>
      )}
      <ThreadPanel chain={chain} topic={topic} onEdit={onEdit} onDiscard={onDiscard} />
    </div>
  );
}

// Anchored near the click when we have one (a node click); centered
// when we don't (opened from a query's Sources list, which has no
// natural screen position to anchor to). Clamped so it can't render
// partway off-screen near an edge.
function computePosition(anchor) {
  if (!anchor) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchor.x + 16;
  let top = anchor.y;
  if (left + WIDTH + margin > vw) left = anchor.x - WIDTH - 16;
  left = Math.max(margin, left);
  top = Math.min(top, vh - MAX_HEIGHT - margin);
  top = Math.max(margin, top);
  return { top: `${top}px`, left: `${left}px` };
}

const containerStyle = {
  position: "fixed",
  width: `${WIDTH}px`,
  maxHeight: `${MAX_HEIGHT}px`,
  overflowY: "auto",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg)",
  padding: "18px",
  paddingTop: "36px",
  boxShadow: "var(--shadow-md)",
  zIndex: 200,
};

const closeButtonStyle = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: "16px",
  lineHeight: 1,
  cursor: "pointer",
};

const locateButtonStyle = {
  position: "absolute",
  top: "12px",
  left: "18px",
  background: "transparent",
  border: "none",
  color: "var(--accent-primary)",
  font: "var(--text-mono-sm)",
  cursor: "pointer",
  padding: 0,
};
