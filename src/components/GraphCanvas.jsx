import React, { useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 800;
const HEIGHT = 560;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Force-directed layout: repulsion between every pair of nodes, gentle
// pull toward center, and an attractive spring between every pair of
// nodes that share a topic -- this is what clusters the graph by
// category instead of by supersession. Supersession never needed its
// own spring: conflict detection only ever chains a claim against
// another claim in the *same* topic (see applyNewClaims in
// graphModel.js), so a correction and what it supersedes are always
// already in the same topic-pair set below. Clustering by topic loses
// no relationship, it just makes topic the primary visual structure
// and demotes history to something read on the node (see Knot below)
// instead of chased across the canvas.
function computeLayout(ids, topicGroups, seedPositions) {
  const positions = new Map();
  ids.forEach((id) => {
    const seed = seedPositions.get(id);
    if (seed) {
      positions.set(id, { ...seed });
    } else {
      const angle = (hashSeed(id) % 360) * (Math.PI / 180);
      const radius = 60 + (hashSeed(id) % 140);
      positions.set(id, {
        x: WIDTH / 2 + Math.cos(angle) * radius,
        y: HEIGHT / 2 + Math.sin(angle) * radius,
      });
    }
  });

  const topicPairs = [];
  topicGroups.forEach((groupIds) => {
    for (let i = 0; i < groupIds.length; i++) {
      for (let j = i + 1; j < groupIds.length; j++) {
        topicPairs.push([groupIds[i], groupIds[j]]);
      }
    }
  });

  for (let iter = 0; iter < 150; iter++) {
    const forces = new Map(ids.map((id) => [id, { x: 0, y: 0 }]));

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i]);
        const b = positions.get(ids[j]);
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = 70;
        if (dist < minDist * 3) {
          const force = ((minDist * minDist) / (dist * dist)) * 4;
          dx /= dist;
          dy /= dist;
          forces.get(ids[i]).x += dx * force;
          forces.get(ids[i]).y += dy * force;
          forces.get(ids[j]).x -= dx * force;
          forces.get(ids[j]).y -= dy * force;
        }
      }
    }

    topicPairs.forEach(([source, target]) => {
      const a = positions.get(source);
      const b = positions.get(target);
      if (!a || !b) return;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const targetDist = 85;
      const force = (dist - targetDist) * 0.012;
      dx /= dist;
      dy /= dist;
      forces.get(source).x += dx * force;
      forces.get(source).y += dy * force;
      forces.get(target).x -= dx * force;
      forces.get(target).y -= dy * force;
    });

    ids.forEach((id) => {
      const p = positions.get(id);
      const f = forces.get(id);
      p.x += (f.x + (WIDTH / 2 - p.x) * 0.01) * 0.6;
      p.y += (f.y + (HEIGHT / 2 - p.y) * 0.01) * 0.6;
      p.x = Math.max(36, Math.min(WIDTH - 36, p.x));
      p.y = Math.max(36, Math.min(HEIGHT - 36, p.y));
    });
  }

  return positions;
}

// Soft, blurred boundary behind each topic's nodes -- proximity plus
// this halo is what communicates "these belong together" now, instead
// of drawn connecting lines (which get messy fast: a 5-claim topic is
// 10 lines as a complete graph). One halo per topic, not per pair.
function ClusterHalo({ cx, cy, r, color }) {
  return <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.09" filter="url(#skein-halo-blur)" />;
}

function Knot({ claim, pos, radius, selected, dragging, topicColor, onPointerDown, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  const color = claim.status === "superseded" ? "var(--color-slate)" : topicColor;
  const raised = claim.status !== "superseded";
  // A claim that corrected an earlier one gets a faint stacked "card
  // behind it" -- history shown on the node itself, in place of what
  // used to be a line drawn back to its predecessor.
  const hasHistory = !!claim.supersedes;

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: dragging ? "grabbing" : "grab", filter: hovered ? "brightness(1.15)" : "none", transition: "filter 150ms ease", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasHistory && (
        <>
          <circle cx={5} cy={5} r={radius} fill={color} opacity="0.28" />
          <circle cx={2.5} cy={2.5} r={radius} fill={color} opacity="0.4" />
        </>
      )}

      {raised ? (
        <>
          <circle r={radius} fill={color} filter="url(#skein-shadow)" />
          <circle r={radius} fill="url(#skein-sheen)" />
        </>
      ) : (
        <>
          <circle r={radius} fill={color} filter="url(#skein-inset)" />
          <circle r={radius} fill="url(#skein-pit)" />
        </>
      )}
      {claim.status === "correction" && (
        <circle r={radius + 4} fill="none" stroke="var(--color-bronze)" strokeWidth="1.4" />
      )}
      <circle
        r={radius + 6}
        fill="none"
        stroke="var(--color-gold-pale)"
        strokeWidth="1.6"
        opacity={selected ? 1 : 0}
        style={{ transition: "opacity 200ms ease" }}
      />
      <text
        y={radius + 14}
        textAnchor="middle"
        style={{ font: "var(--text-mono-sm)", fill: "var(--text-secondary)", pointerEvents: "none" }}
      >
        {claim.text.slice(0, 30)}
        {claim.text.length > 30 ? "…" : ""}
      </text>
    </g>
  );
}

export function GraphCanvas({ claims, onSelectClaim, selectedId, topicColors }) {
  const svgRef = useRef(null);
  const positionsRef = useRef(new Map());
  const [, forceRender] = useState(0);
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef(null);

  const topicGroups = useMemo(() => {
    const m = new Map();
    claims.forEach((c) => {
      if (!m.has(c.topic)) m.set(c.topic, []);
      m.get(c.topic).push(c.id);
    });
    return m;
  }, [claims]);

  // Includes topic in the signature, not just id membership -- editing
  // a claim's topic (recategorizing it from the Thread panel) needs to
  // re-trigger clustering even though the set of ids hasn't changed.
  const idsSignature = claims.map((c) => `${c.id}:${c.topic}`).sort().join(",");

  useEffect(() => {
    const ids = claims.map((c) => c.id);
    const positions = computeLayout(ids, topicGroups, positionsRef.current);
    positionsRef.current = positions;
    forceRender((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsSignature]);

  function toSvgPoint(clientX, clientY) {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function handlePointerDown(claimId, e) {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { id: claimId, moved: false, start: toSvgPoint(e.clientX, e.clientY) };
    setDraggingId(claimId);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    if (Math.abs(p.x - drag.start.x) > 3 || Math.abs(p.y - drag.start.y) > 3) drag.moved = true;
    positionsRef.current.set(drag.id, { x: p.x, y: p.y });
    forceRender((n) => n + 1);
  }

  function handlePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (drag && !drag.moved) onSelectClaim(drag.id);
  }

  return (
    <div style={{ width: "100%", height: "100%", userSelect: "none" }}>
      <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", height: "100%" }}>
        <defs>
          <filter id="skein-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="skein-halo-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="skein-shadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="2.5" dy="3.5" stdDeviation="2.2" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <filter id="skein-inset" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="-1.5" dy="-2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
          </filter>
          <radialGradient id="skein-sheen" cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="skein-pit" cx="32%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {Array.from(topicGroups.entries()).map(([topic, ids]) => {
          const pts = ids.map((id) => positionsRef.current.get(id)).filter(Boolean);
          if (pts.length === 0) return null;
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
          const r = pts.length === 1 ? 44 : Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy))) + 40;
          return <ClusterHalo key={`halo-${topic}`} cx={cx} cy={cy} r={r} color={topicColors.get(topic)} />;
        })}

        {claims.map((c) => {
          const pos = positionsRef.current.get(c.id);
          if (!pos) return null;
          const radius = c.status === "correction" ? 13 : c.status === "superseded" ? 8 : 11;
          return (
            <Knot
              key={c.id}
              claim={c}
              pos={pos}
              radius={radius}
              selected={selectedId === c.id}
              dragging={draggingId === c.id}
              topicColor={topicColors.get(c.topic)}
              onPointerDown={(e) => handlePointerDown(c.id, e)}
            />
          );
        })}
      </svg>
    </div>
  );
}
