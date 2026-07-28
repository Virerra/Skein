import React from "react";

// Shared soft-shadow values for the handful of elements that use
// neumorphism (buttons, cluster filter rows) -- scoped intentionally,
// not a global surface treatment. See README "Visual identity".

// --neu-dark/--neu-light are theme-aware (see colors.css) so the same
// raised/inset shadow reads correctly in both dark and light mode.
export const SHADOW_RAISED = "3px 3px 7px var(--neu-dark), -2px -2px 6px var(--neu-light)";
export const SHADOW_INSET = "inset 2px 2px 5px var(--neu-dark), inset -2px -2px 4px var(--neu-light)";

// box-shadow can't be smoothly transitioned between an outer shadow and
// an inset one -- browsers treat the two as non-interpolable and just
// snap partway through the transition instead of easing, so a plain
// `boxShadow: pressed ? SHADOW_INSET : SHADOW_RAISED` reads as an abrupt
// jump cut no matter what transition duration you give it. Fixed here by
// rendering both shadows as separate absolutely-positioned layers and
// crossfading their opacity instead, which transitions smoothly.
export function NeumorphicShadow({ pressed, showRaised = true, radius = "inherit" }) {
  const layer = (shadow) => ({
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    boxShadow: shadow,
    pointerEvents: "none",
    transition: "opacity 150ms ease",
  });
  return (
    <>
      <span style={{ ...layer(SHADOW_RAISED), opacity: pressed || !showRaised ? 0 : 1 }} />
      <span style={{ ...layer(SHADOW_INSET), opacity: pressed ? 1 : 0 }} />
    </>
  );
}
