import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { motion } from "motion/react";
import { usePeer } from "@/lib/use-peer";

interface ControllerState {
  muted: boolean;
}

export default function BottomBar() {
  const [controller, setController] = useState<Partial<ControllerState>>({
    muted: true,
  });
  const { incomingCall, localStream } = usePeer();

  const handleEndCall = () => {
    if (incomingCall) {
      incomingCall.close();
    }
    // Stop and clear localStream if present
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      // No direct setter here, but context will clear on call end
    }
  };

  return (
    <>
      <Player muted={controller.muted} hidden autoPlay />
      <motion.div
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 w-full flex justify-center items-center gap-4 py-5 bg-background/80 backdrop-blur z-50"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={controller.muted ? "Unmute" : "Mute"}
              onClick={() =>
                setController((prev) => ({ ...prev, muted: !prev.muted }))
              }
              className={
                controller.muted ? "bg-red-500/80 text-white" : undefined
              }
            >
              {controller.muted ? <MicOff /> : <Mic />}
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} side="top">
            {controller.muted ? "Unmute" : "Mute"}
          </TooltipContent>
        </Tooltip>

        {/*
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={inCall ? "Stop video call" : "Start video call"}
              onClick={handleCallToggle}
              className={inCall ? "bg-green-500/80 text-white" : undefined}
            >
              {inCall ? <VideoOff /> : <Video />}
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} side="top">
            {inCall ? "Stop video call" : "Start video call"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={sharing ? "secondary" : "ghost"}
              size="icon"
              aria-label={sharing ? "Stop sharing" : "Share screen"}
              onClick={handleScreenShare}
              className={sharing ? "bg-blue-500/80 text-white" : undefined}
            >
              <MonitorUp />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} side="top">
            {sharing ? "Stop sharing" : "Share screen"}
          </TooltipContent>
        </Tooltip> */}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              aria-label="End call"
              className="bg-destructive text-white"
              onClick={handleEndCall}
            >
              <PhoneOff />
            </Button>
          </TooltipTrigger>
          <TooltipContent sideOffset={4} side="top">
            End call
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </>
  );
}

function Player({ ...props }: React.ComponentPropsWithoutRef<"audio">) {
  const { status } = usePeer();
  const videoRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const remoteStream = status.MediaStream;
    if (remoteStream) {
      videoElement.pause();
      videoElement.srcObject = remoteStream;

      const handleLoadedMetadata = () => {
        videoElement.play().catch((err) => {
          console.error("Error playing the video:", err);
        });
      };

      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        videoElement.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
      };
    } else {
      videoElement.srcObject = null;
    }
  }, [status.MediaStream]);

  return <audio ref={videoRef} className="h-full w-full" {...props} />;
}
