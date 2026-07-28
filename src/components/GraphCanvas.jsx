import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";

const STATUS_COLOR = {
  active: "#DECD87",
  correction: "#B2945B",
  superseded: "#56626C",
};

// Renders the claim graph with Cytoscape. This is separate from the
// design system's decorative <Knot>/<Thread> components — those are
// single-instance illustrations for the guideline pages, not a graph
// layout engine. Cytoscape does force-directed layout, click
// selection, and scales to however many claims actually exist.
export function GraphCanvas({ claims, onSelectClaim, selectedId }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = claims.map((c) => ({
      data: { id: c.id, label: c.text.slice(0, 28) + (c.text.length > 28 ? "…" : ""), status: c.status, topic: c.topic },
    }));

    const edges = claims
      .filter((c) => c.supersedes)
      .map((c) => ({ data: { id: `${c.supersedes}->${c.id}`, source: c.supersedes, target: c.id, kind: "supersedes" } }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele) => STATUS_COLOR[ele.data("status")] || STATUS_COLOR.active,
            "label": "data(label)",
            "color": "#FFF9F0",
            "font-family": "IBM Plex Mono, monospace",
            "font-size": 9,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "width": 34,
            "height": 34,
            "border-width": 2,
            "border-color": "#454341",
          },
        },
        {
          selector: "node[status = 'superseded']",
          style: { "opacity": 0.55, "border-style": "dashed" },
        },
        {
          selector: "node:selected",
          style: { "border-color": "#E9DDAF", "border-width": 3 },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "width": 1.6,
            "line-color": "#B2945B",
            "target-arrow-color": "#B2945B",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.8,
          },
        },
      ],
      layout: { name: "cose", animate: false, padding: 40 },
    });

    cy.on("tap", "node", (evt) => onSelectClaim(evt.target.id()));
    cyRef.current = cy;
    return () => cy.destroy();
  }, [claims]);

  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.nodes().unselect();
    if (selectedId) cyRef.current.getElementById(selectedId).select();
  }, [selectedId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
