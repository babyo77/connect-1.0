"use client";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { usePeer } from "@/lib/peer-context";

export default function IncomingCall() {
  const { status, acceptCall, rejectCall, incomingCall } = usePeer();

  return (
    <AnimatePresence mode="wait">
      {status.type === "incoming_call" && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            duration: 0.4,
          }}
          className="absolute flex flex-col left-0 right-0 items-center space-y-3 bottom-8 justify-end"
        >
          <p className="text-gray-600">
            {incomingCall?.peer?.split("_")[0] || "Unknown"} is calling you
          </p>

          <div className="flex gap-3 justify-center">
            <Button onClick={acceptCall} variant="default" size="lg">
              Answer
            </Button>
            <Button onClick={rejectCall} variant="destructive" size="lg">
              Decline
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
