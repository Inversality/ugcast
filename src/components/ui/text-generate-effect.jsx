"use client";

// Source: Aceternity UI — https://ui.aceternity.com/components/text-generate-effect
// Adapted: framer-motion (no `motion/react`), JSX, themed text + optional gradient.
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  gradient = false,
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");

  useEffect(() => {
    animate(
      "span",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration: duration || 1, delay: stagger(0.12) }
    );
  }, [animate, duration, filter, words]);

  return (
    <div className={cn("font-bold", className)}>
      <motion.div ref={scope} className={cn(gradient && "text-gradient")}>
        {wordsArray.map((word, idx) => (
          <motion.span
            key={word + idx}
            className={cn("opacity-0", !gradient && "text-foreground")}
            style={{ filter: filter ? "blur(10px)" : "none" }}
          >
            {word}{" "}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};
