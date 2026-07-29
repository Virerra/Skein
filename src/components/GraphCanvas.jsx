import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { getAllPositions, putPositions } from "../lib/db";

const WIDTH = 800;
const HEIGHT = 560;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Force-directed layout: repulsion between every pair of nodes, gentle
// pull toward a center point, and an attractive spring between every
// pair of nodes that share a topic -- this is what clusters the graph
// by category instead of by supersession. Supersession never needed
// its own spring: conflict detection only ever chains a claim against
// another claim in the *same* topic (see applyNewClaims in
// graphModel.js), so a correction and what it supersedes are always
// already in the same topic-pair set below.
//
// centerOf(id) -> {x,y} is optional and defaults to the canvas center
// for every node -- the normal, everyday layout. Organize (below)
// passes a per-topic zone instead, so each cluster gets pulled toward
// its own patch of canvas rather than all competing for the same
// center point.
function computeLayout(ids, topicGroups, seedPositions, centerOf) {
  const getCenter = centerOf || (() => ({ x: WIDTH / 2, y: HEIGHT / 2 }));
  const positions = new Map();
  ids.forEach((id) => {
    const seed = seedPositions.get(id);
    if (seed) {
      positions.set(id, { ...seed });
    } else {
      const center = getCenter(id);
      const angle = (hashSeed(id) % 360) * (Math.PI / 180);
      const radius = 60 + (hashSeed(id) % 140);
      positions.set(id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
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
      const center = getCenter(id);
      p.x += (f.x + (center.x - p.x) * 0.01) * 0.6;
      p.y += (f.y + (center.y - p.y) * 0.01) * 0.6;
      p.x = Math.max(36, Math.min(WIDTH - 36, p.x));
      p.y = Math.max(36, Math.min(HEIGHT - 36, p.y));
    });
  }

  return positions;
}

// Evenly spaced target points around the canvas, one per topic --
// what Organize pulls each cluster toward, so distinct topics settle
// into distinct regions instead of physics alone deciding whether
// they overlap.
function computeTopicZones(topics) {
  const zones = new Map();
  const n = topics.length;
  if (n === 0) return zones;
  if (n === 1) {
    zones.set(topics[0], { x: WIDTH / 2, y: HEIGHT / 2 });
    return zones;
  }
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const layoutRadius = Math.min(WIDTH, HEIGHT) * 0.34;
  topics.forEach((topic, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    zones.set(topic, { x: cx + Math.cos(angle) * layoutRadius, y: cy + Math.sin(angle) * layoutRadius });
  });
  return zones;
}

// Soft blob behind each topic's nodes -- proximity plus this halo
// communicates "these belong together," instead of drawn connecting
// lines (which get messy fast: a 5-claim topic is 10 lines as a
// complete graph). Deliberately NOT one circle sized to the farthest
// node: that reads as "a circle that gets bigger or smaller," an
// artificial boundary that doesn't actually follow the cluster's real
// shape, ballooning for any elongated or irregular arrangement.
//
// Instead: one small soft circle per node in the topic, all fed
// through a shared blur, then an feColorMatrix that pushes the alpha
// channel through a steep threshold (the classic SVG "goo"/metaball
// recipe). Wherever two node-circles overlap or sit close, their
// blurred edges combine past the threshold and fuse into one solid
// blob; isolated tails fade out below it. The result actually traces
// the cluster's shape -- stretches, bends, branches -- rather than
// approximating it with a single piece of geometry.
function ClusterBlob({ ids, positions, color }) {
  return (
    <g filter="url(#skein-goo)" style={{ pointerEvents: "none" }} opacity="0.5">
      {ids.map((id) => {
        const p = positions.get(id);
        if (!p) return null;
        return (
          <circle
            key={id}
            cx={p.x}
            cy={p.y}
            r={34}
            fill={color}
            style={{ transition: "cx 400ms ease, cy 400ms ease" }}
          />
        );
      })}
    </g>
  );
}

// A manually-declared relation between two claims, independent of
// topic and status -- deliberately neutral-colored (not gold, not any
// topic hue) so it reads as "someone drew this on purpose" rather than
// being mistaken for a status or category signal. Wide invisible hit
// stroke underneath the visible thin dashed line, so it's actually
// clickable to delete without needing pixel-perfect precision.
function RelationLine({ a, b, onDelete }) {
  return (
    <g style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()} onClick={onDelete}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="14" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--text-secondary)" strokeWidth="1.3" strokeDasharray="3 4" opacity="0.55" />
    </g>
  );
}

function Knot({ claim, pos, radius, selected, isRelateAnchor, dragging, topicColor, onPointerDown }) {
  const [hovered, setHovered] = React.useState(false);
  const color = claim.status === "superseded" ? "var(--color-slate)" : topicColor;
  const raised = claim.status !== "superseded";

  return (
    <g
      transform={`translate(${pos.x},${pos.y})`}
      style={{ cursor: dragging ? "grabbing" : "grab", filter: hovered ? "brightness(1.15)" : "none", transition: "filter 150ms ease", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
      {isRelateAnchor && (
        <circle r={radius + 8} fill="none" stroke="var(--text-primary)" strokeWidth="1.6" strokeDasharray="3 3" />
      )}
      <text
        y={radius + 14}
        textAnchor="middle"
        style={{ font: "var(--text-mono-sm)", fill: "var(--text-secondary)", pointerEvents: "none" }}
      >
        {claim.label || (claim.text.length > 28 ? claim.text.slice(0, 28) + "…" : claim.text)}
      </text>
    </g>
  );
}

export const GraphCanvas = forwardRef(function GraphCanvas({
  claims,
  onSelectClaim,
  selectedId,
  topicColors,
  relations = [],
  relateMode = false,
  onCreateRelation,
  onDeleteRelation,
}, ref) {
  const svgRef = useRef(null);
  const positionsRef = useRef(new Map());
  const [, forceRender] = useState(0);
  const [draggingId, setDraggingId] = useState(null);
  const dragRef = useRef(null);
  const [relateAnchor, setRelateAnchor] = useState(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const panRef = useRef(null);
  // Gates the first layout run: without it, the very first render would
  // seed nodes fresh, run 150 iterations of physics, and paint that,
  // only to immediately jump once the real saved positions load a beat
  // later. IndexedDB reads are fast enough in practice that this just
  // means a near-instant blank canvas rather than a visible flash.
  const [positionsLoaded, setPositionsLoaded] = useState(false);

  // Imperative escape hatch for "center the view on this node" -- used
  // by the mini-window's Locate button. Deliberately not lifting pan/
  // zoom state up to App.jsx for this: it's the one thing App needs to
  // trigger here, not something it needs to own.
  useImperativeHandle(ref, () => ({
    focusNode(id) {
      const pos = positionsRef.current.get(id);
      if (!pos) return false;
      setView((v) => ({ scale: v.scale, x: WIDTH / 2 - pos.x * v.scale, y: HEIGHT / 2 - pos.y * v.scale }));
      return true;
    },
  }));

  useEffect(() => {
    getAllPositions()
      .then((saved) => saved.forEach((p) => positionsRef.current.set(p.id, { x: p.x, y: p.y })))
      .catch(() => {}) // fail open -- worst case, layout just starts fresh instead of restoring
      .finally(() => setPositionsLoaded(true));
  }, []);

  function persistPositions(positions) {
    const records = Array.from(positions, ([id, p]) => ({ id, x: p.x, y: p.y }));
    putPositions(records).catch(() => {}); // best-effort -- a failed save just means next session starts fresh, not worth surfacing as an error to the user
  }

  useEffect(() => {
    if (!relateMode) setRelateAnchor(null);
  }, [relateMode]);

  const topicGroups = useMemo(() => {
    const m = new Map();
    claims.forEach((c) => {
      if (!m.has(c.topic)) m.set(c.topic, []);
      m.get(c.topic).push(c.id);
    });
    return m;
  }, [claims]);

  // Includes topic in the signature, not just id membership -- editing
  // a claim's topic (recategorizing it, by hand or via Categorize)
  // needs to re-trigger clustering even though the set of ids hasn't
  // changed.
  const idsSignature = claims.map((c) => `${c.id}:${c.topic}`).sort().join(",");

  useEffect(() => {
    if (!positionsLoaded) return;
    const ids = claims.map((c) => c.id);
    const positions = computeLayout(ids, topicGroups, positionsRef.current);
    // Merge, don't replace -- computeLayout only returns entries for
    // the ids passed in, i.e. currently-visible claims (App.jsx's
    // cluster filter can hide others). Replacing the ref wholesale
    // would silently forget remembered positions for anything hidden
    // at this exact moment, recoverable only by a page reload.
    positions.forEach((p, id) => positionsRef.current.set(id, p));
    forceRender((n) => n + 1);
    persistPositions(positionsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsSignature, positionsLoaded]);

  // Full reflow: ignores current (possibly dragged, possibly organic)
  // positions and reseeds every node near its topic's own zone, then
  // lets physics settle from there. Distinct from the everyday layout
  // effect above, which preserves whatever's already on screen and
  // only nudges things via the topic spring -- Organize is the
  // explicit "start over, cleanly" action.
  function handleOrganize() {
    const topics = Array.from(topicGroups.keys());
    const zones = computeTopicZones(topics);
    const topicOf = new Map(claims.map((c) => [c.id, c.topic]));
    const centerOf = (id) => zones.get(topicOf.get(id)) || { x: WIDTH / 2, y: HEIGHT / 2 };
    const ids = claims.map((c) => c.id);
    const positions = computeLayout(ids, topicGroups, new Map(), centerOf);
    positions.forEach((p, id) => positionsRef.current.set(id, p));
    forceRender((n) => n + 1);
    persistPositions(positionsRef.current);
  }

  // Raw point in the fixed 0..WIDTH/0..HEIGHT viewBox space (before pan/zoom).
  function toViewboxPoint(clientX, clientY) {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  // Point in world/model space -- where node positions actually live,
  // independent of the current pan/zoom. Viewbox and world space are
  // the same thing at view = {scale:1, x:0, y:0}; they diverge once
  // the user pans or zooms.
  function toWorldPoint(clientX, clientY) {
    const vp = toViewboxPoint(clientX, clientY);
    return { x: (vp.x - view.x) / view.scale, y: (vp.y - view.y) / view.scale };
  }

  function zoomToward(anchorViewboxPt, factor) {
    setView((v) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      const ratio = newScale / v.scale;
      return {
        scale: newScale,
        x: anchorViewboxPt.x - ratio * (anchorViewboxPt.x - v.x),
        y: anchorViewboxPt.y - ratio * (anchorViewboxPt.y - v.y),
      };
    });
  }

  // Attached manually (not via onWheel) so preventDefault reliably
  // stops the page from scrolling while zooming the graph -- React's
  // synthetic wheel handler is passive by default in recent versions,
  // which silently ignores preventDefault and left the page scrolling
  // underneath the canvas.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function handleWheel(e) {
      e.preventDefault();
      zoomToward(toViewboxPoint(e.clientX, e.clientY), e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBackgroundPointerDown(e) {
    panRef.current = { startClientX: e.clientX, startClientY: e.clientY, startViewX: view.x, startViewY: view.y };
    window.addEventListener("pointermove", handleBackgroundPointerMove);
    window.addEventListener("pointerup", handleBackgroundPointerUp);
  }

  function handleBackgroundPointerMove(e) {
    const p = panRef.current;
    if (!p) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - p.startClientX) * (WIDTH / rect.width);
    const dy = (e.clientY - p.startClientY) * (HEIGHT / rect.height);
    setView((v) => ({ ...v, x: p.startViewX + dx, y: p.startViewY + dy }));
  }

  function handleBackgroundPointerUp() {
    panRef.current = null;
    window.removeEventListener("pointermove", handleBackgroundPointerMove);
    window.removeEventListener("pointerup", handleBackgroundPointerUp);
  }

  function handlePointerDown(claimId, e) {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { id: claimId, moved: false, start: toWorldPoint(e.clientX, e.clientY) };
    setDraggingId(claimId);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toWorldPoint(e.clientX, e.clientY);
    if (Math.abs(p.x - drag.start.x) > 3 || Math.abs(p.y - drag.start.y) > 3) drag.moved = true;
    positionsRef.current.set(drag.id, { x: p.x, y: p.y });
    forceRender((n) => n + 1);
  }

  function handlePointerUp(e) {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    if (!drag) return;

    if (drag.moved) {
      persistPositions(positionsRef.current); // dragged somewhere new -- remember it
      return;
    }

    if (relateMode) {
      if (relateAnchor === null) {
        setRelateAnchor(drag.id);
      } else if (relateAnchor === drag.id) {
        setRelateAnchor(null); // clicking the armed node again disarms it
      } else {
        onCreateRelation?.(relateAnchor, drag.id);
        // anchor stays armed, so one node can be connected to several in a row
      }
    } else {
      onSelectClaim(drag.id, { x: e.clientX, y: e.clientY });
    }
  }

  function zoomBy(factor) {
    zoomToward({ x: WIDTH / 2, y: HEIGHT / 2 }, factor);
  }

  function resetView() {
    setView({ scale: 1, x: 0, y: 0 });
  }

  return (
    <div style={{ width: "100%", height: "100%", userSelect: "none", position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "100%", touchAction: "none", cursor: relateMode ? "crosshair" : "default" }}
        onPointerDown={handleBackgroundPointerDown}
      >
        <defs>
          <filter id="skein-goo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blurred" />
            <feColorMatrix
              in="blurred"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
            />
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

        <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
          {Array.from(topicGroups.entries()).map(([topic, ids]) => (
            <ClusterBlob key={`halo-${topic}`} ids={ids} positions={positionsRef.current} color={topicColors.get(topic)} />
          ))}

          {relations.map((r) => {
            const a = positionsRef.current.get(r.a);
            const b = positionsRef.current.get(r.b);
            if (!a || !b) return null;
            return <RelationLine key={r.id} a={a} b={b} onDelete={() => onDeleteRelation?.(r.id)} />;
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
                isRelateAnchor={relateAnchor === c.id}
                dragging={draggingId === c.id}
                topicColor={topicColors.get(c.topic)}
                onPointerDown={(e) => handlePointerDown(c.id, e)}
              />
            );
          })}
        </g>
      </svg>

      <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <button onClick={() => zoomBy(1.25)} style={zoomButtonStyle} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.25)} style={zoomButtonStyle} aria-label="Zoom out">−</button>
        <button onClick={resetView} style={{ ...zoomButtonStyle, fontSize: "12px" }} aria-label="Reset zoom">⟲</button>
      </div>

      {relateMode && (
        <div style={hintBadgeStyle}>
          {relateAnchor ? "Click another node to connect — or click the armed one again to cancel" : "Click a node to start connecting"}
        </div>
      )}

      <button onClick={handleOrganize} style={organizeButtonStyle}>Organize clusters</button>
    </div>
  );
});

const zoomButtonStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-raised)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-ui)",
  fontSize: "15px",
  lineHeight: 1,
  cursor: "pointer",
};

const hintBadgeStyle = {
  position: "absolute",
  top: "12px",
  left: "12px",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  padding: "6px 10px",
  font: "var(--text-mono-sm)",
  color: "var(--text-secondary)",
};

const organizeButtonStyle = {
  position: "absolute",
  top: "12px",
  right: "12px",
  padding: "6px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-raised)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-ui)",
  fontSize: "12px",
  cursor: "pointer",
};
