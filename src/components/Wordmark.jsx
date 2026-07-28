import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Fractions measured directly from public/logo.svg via getBBox: the
// dot's center sits ~72.5% across the wordmark's width and ~26% down
// from its top, with a diameter ~18% of the wordmark's height. Applied
// here as fractions of our own live-rendered text so the placement
// stays faithful to the source file even though the actual font
// differs (PT Serif Bold web substitute vs. the licensed Century Bold
// the file was authored in).
const DOT_X_FRACTION = 0.7254;
const DOT_Y_FRACTION = 0.2576;
const DOT_SIZE_FRACTION = 0.179;

export function Wordmark() {
  const textRef = useRef(null);
  const [dot, setDot] = useState(null);

  function measure() {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setDot({
      left: rect.width * DOT_X_FRACTION,
      top: rect.height * DOT_Y_FRACTION,
      size: rect.height * DOT_SIZE_FRACTION,
    });
  }

  // Measure once immediately (covers cached-font repeat visits) and
  // again once the web font actually finishes loading -- PT Serif is
  // fetched async with font-display:swap, so a layout-effect measurement
  // taken before it swaps in reads fallback-font metrics and places the
  // dot against the wrong text width.
  useLayoutEffect(measure, []);
  useEffect(() => {
    document.fonts?.ready?.then(measure);
  }, []);

  return (
    <div style={{ font: "var(--text-heading)", fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "18px", position: "relative", display: "inline-block" }}>
      <span ref={textRef} aria-hidden="true">Skeın</span>
      {dot && (
        <span
          style={{
            position: "absolute",
            left: dot.left - dot.size / 2,
            top: dot.top - dot.size / 2,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: "var(--color-gold)",
          }}
        />
      )}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Skein</span>
    </div>
  );
}
