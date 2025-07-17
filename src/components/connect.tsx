"use client";
import { useUser } from "@/lib/user-context";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Babylonica } from "next/font/google";
import BlurFadeIn from "./blur-fade-in";
import { Copy, Check } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { useState as useReactState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { usePeer } from "@/lib/use-peer";
import ShimmerLoader from "./loader";

const prociono = Babylonica({
  variable: "--font-prociono-sans",
  subsets: ["latin"],
  weight: "400",
});

export default function Connect() {
  const { state, dispatch } = useUser();
  const router = useRouter();
  const [visible, setVisible] = useReactState(true);
  const [nextId, setNextId] = useReactState<string | undefined>(undefined);
  const { status } = usePeer();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setNextId(state?.peerId);
    setVisible(false);
  };

  const handleExitComplete = () => {
    if (nextId) {
      router.push(`/${nextId}`);
    }
  };

  if (status.type === "connecting" || status.type === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-between">
        <ShimmerLoader>Connecting to server...</ShimmerLoader>
      </div>
    );
  }

  if (status.type === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl font-medium text-red-400 shimmer-text">
          {status.error}
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <BlurFadeIn className="w-full max-w-md mx-auto mb-10">
          <h2
            className={`text-7xl text-center mb-4 ${prociono.className} ${prociono.variable}`}
          >
            Connects
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoFocus
              type="text"
              name="id"
              value={state?.peerId}
              onChange={(e) =>
                dispatch({
                  type: "SET_USER",
                  payload: { peerId: e.target.value },
                })
              }
              placeholder="Enter peer id"
              required
            />

            <Button type="submit" className="w-full">
              Connect
            </Button>
            <div className="flex items-center justify-center gap-2">
              <p className="text-center text-xs">Your Id: {state?.id}</p>
              {state?.id && <CopyToClipboardButton value={state.id} />}
            </div>
          </form>
        </BlurFadeIn>
      )}
    </AnimatePresence>
  );
}

function CopyToClipboardButton({ value }: { value: string }) {
  const [copied, setCopied] = useReactState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Copy ID"
          onClick={handleCopy}
          className="rounded hover:bg-muted transition-colors"
        >
          {copied ? (
            <Check className="size-3 text-green-500" />
          ) : (
            <Copy className="size-3" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={4} side="bottom">
        {copied ? "Copied!" : "Copy"}
      </TooltipContent>
    </Tooltip>
  );
}
