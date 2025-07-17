import { motion } from "motion/react";
import React from "react";

export default function ShimmerLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key="loader"
      className="w-full max-w-md  mx-auto flex flex-col items-center justify-center"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <span className="text-xl font-medium text-[#a3a3a3] shimmer-text">
        {children}
      </span>
    </motion.div>
  );
}
