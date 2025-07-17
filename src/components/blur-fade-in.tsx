"use client";
import { ReactNode } from "react";
import { motion } from "motion/react";

interface BlurFadeInProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}

export default function BlurFadeIn({
  children,
  duration = 0.9,
  delay = 0,
  className = "",
}: BlurFadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(18px)", scale: 0.92 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      exit={{
        opacity: 0,
        filter: "blur(18px)",
        scale: 0.92,
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
