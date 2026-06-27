"use client";

/* ============================================================================
   Aceternity-inspired UI primitives (https://ui.aceternity.com)
   Re-implemented locally with framer-motion + Tailwind v4 tokens.
   ========================================================================== */

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
   AuroraBackground — animated, blurred conic-gradient glow behind content.
   Wrap a section; children render above the aurora.
---------------------------------------------------------------------------- */
export function AuroraBackground({ children, className, showGrid = true, ...props }) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <div className="aurora-bg" />
      {showGrid && <div className="absolute inset-0 bg-grid pointer-events-none" />}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Spotlight — large soft radial light, typically top-anchored.
---------------------------------------------------------------------------- */
export function Spotlight({ className, fill = "var(--color-primary-500)" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[60rem] rounded-full blur-[120px] opacity-30",
        className
      )}
      style={{ background: `radial-gradient(circle at center, ${fill}, transparent 60%)` }}
    />
  );
}

/* ----------------------------------------------------------------------------
   GlowCard — card that tracks the cursor with a radial spotlight glow.
---------------------------------------------------------------------------- */
export function GlowCard({ children, className, as: Tag = "div", ...props }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={handleMove}
      className={cn("spotlight-card glass-card p-6 transition-colors duration-300", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------------------
   GradientText — animated gradient clipped to text.
---------------------------------------------------------------------------- */
export function GradientText({ children, className, animate = false, as: Tag = "span", ...props }) {
  return (
    <Tag
      className={cn("text-gradient", animate && "animate-gradient-x", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------------------
   MovingBorderButton — button wrapped in a rotating conic-gradient border.
---------------------------------------------------------------------------- */
export function MovingBorderButton({ children, className, containerClassName, as: Tag = "button", ...props }) {
  return (
    <Tag className={cn("moving-border p-[1.5px]", containerClassName)} {...props}>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-2 rounded-full bg-bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-bg-card-hover",
          className
        )}
      >
        {children}
      </span>
    </Tag>
  );
}

/* ----------------------------------------------------------------------------
   BackgroundBeams — faint animated dot grid backdrop for empty states.
---------------------------------------------------------------------------- */
export function BackgroundBeams({ className }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-dot opacity-60" />
      <Spotlight className="opacity-20" />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   ShimmerBadge — small pill with a sweeping shimmer highlight.
---------------------------------------------------------------------------- */
export function ShimmerBadge({ children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-bg px-3 py-1 text-[11px] font-semibold text-muted",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
      </span>
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------------------
   TiltCard — subtle 3D tilt on hover (framer-motion).
---------------------------------------------------------------------------- */
export function TiltCard({ children, className, ...props }) {
  const ref = useRef(null);
  const [transform, setTransform] = useState("");

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg)`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setTransform("")}
      style={{ transform, transformStyle: "preserve-3d" }}
      className={cn("transition-transform duration-200 ease-out will-change-transform", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
