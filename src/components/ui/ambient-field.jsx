"use client";

// AmbientField — the immersive "cinematic stage" backdrop for the workspace
// canvas. Layers a breathing central glow, a field of drifting gold embers,
// and an edge vignette so the hero/composer no longer float in dead space.
//
// All motion is pure CSS (see globals.css: .stage-glow / .ember / .canvas-vignette)
// and honors prefers-reduced-motion. Particle values are seeded deterministically
// so the server- and client-rendered markup match (no hydration mismatch).
import { cn } from "@/lib/utils";

// Deterministic pseudo-random in [0,1) — stable across SSR/CSR for a given seed.
const rand = (seed) => {
  const x = Math.sin(seed * 99.13) * 10000;
  return x - Math.floor(x);
};

// Pre-computed embers. Negative delays start particles mid-flight so the field
// is already populated on first paint instead of all rising from the bottom.
const EMBERS = Array.from({ length: 26 }, (_, i) => {
  const r1 = rand(i + 1);
  const r2 = rand(i + 7);
  const r3 = rand(i + 13);
  const r4 = rand(i + 21);
  return {
    left: `${(r1 * 100).toFixed(2)}%`,
    "--ember-size": `${(2 + r2 * 3.5).toFixed(2)}px`, // 2–5.5px
    "--ember-duration": `${(13 + r3 * 13).toFixed(2)}s`, // 13–26s
    "--ember-delay": `${(-r4 * 22).toFixed(2)}s`, // staggered, mid-flight start
    "--ember-travel": `${(58 + r2 * 37).toFixed(0)}vh`, // 58–95vh
    "--ember-drift": `${((r3 - 0.5) * 80).toFixed(0)}px`, // -40–40px sideways
    "--ember-opacity": (0.32 + r1 * 0.43).toFixed(2), // 0.32–0.75
  };
});

export function AmbientField({ className, embers = true, glow = true, vignette = true }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {glow && <div className="stage-glow" />}
      {embers &&
        EMBERS.map((style, i) => (
          <span key={i} className="ember" style={style} />
        ))}
      {vignette && <div className="canvas-vignette" />}
    </div>
  );
}
