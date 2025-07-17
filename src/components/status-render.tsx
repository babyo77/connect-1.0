import { usePeer } from "@/lib/peer-context";
import ShimmerLoader from "./loader";
import BottomBar from "./bottom-bar";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUser } from "@/lib/user-context";

export default function StatusRender() {
  const { status, incomingCall } = usePeer();
  const { state } = useUser();

  const router = useRouter();

  if (status.type === "permission") {
    return (
      <div className="min-h-screen flex items-center justify-between">
        <ShimmerLoader>Checking permissions...</ShimmerLoader>
      </div>
    );
  }

  if (status.type === "connecting" || status.type === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-between">
        <ShimmerLoader>Connecting to server...</ShimmerLoader>
      </div>
    );
  }

  if (status.type === "calling_peer") {
    return (
      <div className="min-h-screen flex items-center justify-between">
        <ShimmerLoader>Calling peer...</ShimmerLoader>
      </div>
    );
  }

  if (status.type === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-medium text-red-400 shimmer-text">
          {status.error}
        </p>
        <motion.div
          className="absolute bottom-5 flex gap-3"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 300,
            duration: 0.4,
          }}
        >
          <Button
            onClick={() => window.location.reload()}
            size={"sm"}
            variant={"secondary"}
          >
            Call again?
          </Button>
          <Button
            onClick={() => router.push("/")}
            size={"sm"}
            variant={"destructive"}
          >
            End call
          </Button>
        </motion.div>
      </div>
    );
  }

  if (status.type === "peer_connected") {
    return (
      <div className="min-h-screen flex flex-col text-center p-5 pb-20 gap-3">
        <p>
          {" "}
          {state?.id?.split("_")[0].toUpperCase() || "Unknown"} x{" "}
          {state?.peerId?.split("_")[0].toUpperCase() || "Unknown"}{" "}
        </p>
        <div className="grid grid-cols-2 w-full h-full gap-4 flex-1">
          <div className="p-4 relative border col-span-1 rounded-xl backdrop-blur-md bg-gradient-to-br from-white/5 to-zinc-100/10 flex items-center justify-center">
            <div className="backdrop-blur-md border-4 border-zinc/30 rounded-full flex items-center justify-center">
              <Avatar className="size-24">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${
                    state?.id?.split("_")[0]?.[0] || "U"
                  }`}
                  alt={state?.id?.split("_")[0]?.[0] || "U"}
                />
                <AvatarFallback>
                  {state?.id?.split("_")[0]?.split("")[0] || "Unknown"}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className=" absolute bottom-2 right-3"> You</p>
          </div>
          <div className="border relative p-4 col-span-1 rounded-xl backdrop-blur-md bg-gradient-to-br from-white/5 to-zinc-100/10 flex items-center justify-center">
            <div className="backdrop-blur-md border-4 border-zinc/30 rounded-full flex items-center justify-center">
              <Avatar className="size-24">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${
                    incomingCall?.metadata?.id?.split("_")[0]?.[0] || "U"
                  }`}
                  alt={incomingCall?.metadata?.id?.split("_")[0]?.[0] || "U"}
                />
                <AvatarFallback>
                  {state?.peerId?.split("_")[0]?.split("")[0] || "Unknown"}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className=" absolute bottom-2 right-3">
              {" "}
              {state?.peerId?.split("_")[0] || "Unknown"}
            </p>
          </div>
        </div>
        <BottomBar />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-between">
      <ShimmerLoader>Connects</ShimmerLoader>
    </div>
  );
}
