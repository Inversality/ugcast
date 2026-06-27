"use client";

// Source: Aceternity UI — https://ui.aceternity.com/components/aurora-background
// Adapted for this project: framer-motion (no `motion/react`), JSX, always-dark theme.
import { cn } from "@/lib/utils";

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        "transition-bg relative flex flex-col items-center justify-center bg-bg-page text-foreground",
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          "--aurora":
            "repeating-linear-gradient(100deg,var(--color-primary-500)_10%,var(--color-primary-300)_15%,#3f7d5a_20%,var(--color-secondary-400)_25%,var(--color-primary-400)_30%)",
          "--dark-gradient":
            "repeating-linear-gradient(100deg,#000_0%,#000_7%,transparent_10%,transparent_12%,#000_16%)",
          "--blue-300": "#3f7d5a",
          "--blue-400": "var(--color-primary-400)",
          "--blue-500": "var(--color-primary-500)",
          "--indigo-300": "var(--color-primary-300)",
          "--violet-200": "var(--color-secondary-400)",
          "--black": "#000",
          "--white": "#fff",
          "--transparent": "transparent",
        }}
      >
        <div
          className={cn(
            `after:animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--dark-gradient),var(--aurora)] [background-size:300%,_200%] [background-position:50%_50%,50%_50%] opacity-40 blur-[10px] will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] after:absolute after:inset-0 after:[background-image:var(--dark-gradient),var(--aurora)] after:[background-size:200%,_100%] after:[background-attachment:fixed] after:mix-blend-difference after:content-[""]`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
          )}
        ></div>
      </div>
      {children}
    </div>
  );
};
