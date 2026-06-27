"use client";

import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { motion } from "framer-motion";

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  ...props
}) {
  const baseStyles =
    "relative inline-flex items-center justify-center rounded-full font-semibold tracking-tight transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    // Indigo→violet gradient with a soft glow — the hero CTA look.
    primary:
      "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page glow-primary hover:brightness-110",
    secondary:
      "bg-bg-card-hover text-foreground border border-glass-border hover:bg-glass-hover",
    outline:
      "border border-primary-500/60 text-primary-300 hover:bg-primary-500/10",
    glass: "glass-card !rounded-full text-foreground hover:bg-glass-hover",
    ghost: "text-muted hover:text-foreground hover:bg-glass-hover",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm gap-1.5",
    md: "px-6 py-2.5 text-sm gap-2",
    lg: "px-8 py-3.5 text-base gap-2.5",
  };

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </motion.button>
  );
}
