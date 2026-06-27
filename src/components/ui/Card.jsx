"use client";

import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import { useRef } from "react";

export function Card({ children, className, hover = true, ...props }) {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={hover ? { y: -4 } : {}}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={twMerge(
        "spotlight-card glass-card p-6 relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function CardHeader({ children, className }) {
  return <div className={twMerge("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return <h3 className={twMerge("text-lg font-bold tracking-tight text-foreground", className)}>{children}</h3>;
}

export function CardContent({ children, className }) {
  return <div className={twMerge("text-sm text-muted leading-relaxed", className)}>{children}</div>;
}
