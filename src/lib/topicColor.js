// Deterministic topic -> hue assignment, so the same topic label always
// gets the same color across sessions without persisting a color map.
//
// Palette stays inside Skein's warm-neutral family (the core gold plus
// clay/moss/teal/plum/ochre) rather than a saturated rainbow, per the
// design system's "topic vs. status" rule: hue encodes topic, status
// (active/superseded/correction) rides on top independently. A topic
// count beyond the palette length wraps and reuses a hue -- acceptable
// for a personal graph, not meant to scale to hundreds of topics.
//
// Two palettes, not one: the dark-mode hues are pale enough to glow
// against a near-black surface but measured under 2:1 contrast against
// the light-mode background -- effectively invisible. The light-mode
// palette is the same hue family, deepened until each color clears
// ~4:1 against the light surface.

const PALETTE_DARK = ["#DECD87", "#C77B58", "#8A9A5B", "#6E9B96", "#8C6E8C", "#C99A3E"];
const PALETTE_LIGHT = ["#8A6A1E", "#9C5636", "#5E6B38", "#3F726D", "#6B4F6B", "#8F6A1A"];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Assigns each topic a palette slot, seeded by its hash for stability
// across reloads, but bumped to the next free slot on collision so two
// different topics never render as the same color while the topic
// count fits the palette. Beyond palette.length distinct topics, slots
// run out and reuse is unavoidable -- acceptable for a personal graph.
export function assignTopicColors(topics, theme = "dark") {
  const palette = theme === "light" ? PALETTE_LIGHT : PALETTE_DARK;
  const unique = Array.from(new Set(topics)).sort();
  const used = new Set();
  const colors = new Map();
  unique.forEach((topic) => {
    let idx = hashString(topic) % palette.length;
    let tries = 0;
    while (used.has(idx) && tries < palette.length) {
      idx = (idx + 1) % palette.length;
      tries++;
    }
    used.add(idx);
    colors.set(topic, palette[idx]);
  });
  return colors;
}
