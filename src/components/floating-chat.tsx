"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Button } from "./ui/button";
import { usePeer } from "../lib/peer-context";
import { DataConnection } from "peerjs";

// Minimal styles for the chat window
const chatWindowStyle =
  "fixed z-50 bottom-6 right-6 w-80 max-w-[90vw] bg-white dark:bg-zinc-900 rounded-xl shadow-xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800";
const chatHeaderStyle =
  "flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900";
const chatBodyStyle =
  "flex-1 px-4 py-2 overflow-y-auto text-sm text-zinc-800 dark:text-zinc-200";
const chatInputStyle =
  "flex items-center gap-2 px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900";

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const dragConstraintsRef = useRef(null);
  const [input, setInput] = useState("");
  const { peer, status, incomingCall } = usePeer();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 520 }); // larger default
  const minSize = { width: 320, height: 320 };
  const maxSize = { width: 640, height: 720 };
  const resizing = useRef<{
    dir: string | null;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({ dir: null, startX: 0, startY: 0, startW: 0, startH: 0 });

  const [messages, setMessages] = useState<
    Array<{ sender: string; text: string; self: boolean }>
  >([]);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store the DataConnection
  const dataConnRef = useRef<DataConnection | null>(null);

  // Helper to add message
  const addMessage = (msg: { sender: string; text: string; self: boolean }) =>
    setMessages((msgs) => [...msgs, msg]);

  // Setup incoming DataConnection listener (receiver side)
  useEffect(() => {
    if (!peer.current) return;
    const handleConnection = (conn: DataConnection) => {
      if (conn.label !== "chat") return;
      dataConnRef.current = conn;
      setConnected(true);
      setError(null);
      conn.on("data", (data) => {
        addMessage({ sender: conn.peer, text: String(data), self: false });
      });
      conn.on("open", () => setConnected(true));
      conn.on("close", () => setConnected(false));
      conn.on("error", (err) => {
        setConnected(false);
        setError(
          typeof err === "string" ? err : err?.message || "Connection error"
        );
      });
    };
    peer.current.on("connection", handleConnection);
    return () => {
      peer.current?.off("connection", handleConnection);
    };
  }, [peer]);

  // Setup outgoing DataConnection (initiator side)
  useEffect(() => {
    // Only connect if we have a peer to connect to and no connection yet
    if (!peer.current || !incomingCall?.peer || dataConnRef.current) return;
    // Initiate connection with label 'chat'
    const conn = peer.current.connect(incomingCall.peer, { label: "chat" });
    dataConnRef.current = conn;
    conn.on("data", (data) => {
      addMessage({ sender: conn.peer, text: String(data), self: false });
    });
    conn.on("open", () => setConnected(true));
    conn.on("close", () => setConnected(false));
    conn.on("error", (err) => {
      setConnected(false);
      setError(
        typeof err === "string" ? err : err?.message || "Connection error"
      );
    });
    // Clean up on unmount
    return () => {
      conn.close();
      if (dataConnRef.current === conn) dataConnRef.current = null;
    };
  }, [peer, incomingCall]);

  const [unread, setUnread] = useState(false);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open && messages.length > prevMessagesLength.current) {
      setUnread(true);
    }
    prevMessagesLength.current = messages.length;
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const onResizeStart = (dir: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  };
  const onResizeMove = (e: MouseEvent) => {
    const { dir, startX, startY, startW, startH } = resizing.current;
    if (!dir) return;
    let newW = startW;
    let newH = startH;
    if (dir.includes("right"))
      newW = Math.min(
        maxSize.width,
        Math.max(minSize.width, startW + (e.clientX - startX))
      );
    if (dir.includes("left"))
      newW = Math.min(
        maxSize.width,
        Math.max(minSize.width, startW - (e.clientX - startX))
      );
    if (dir.includes("bottom"))
      newH = Math.min(
        maxSize.height,
        Math.max(minSize.height, startH + (e.clientY - startY))
      );
    if (dir.includes("top"))
      newH = Math.min(
        maxSize.height,
        Math.max(minSize.height, startH - (e.clientY - startY))
      );
    setSize({ width: newW, height: newH });
  };
  const onResizeEnd = () => {
    resizing.current.dir = null;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send(input.trim());
      addMessage({
        sender: peer.current?.id || "me",
        text: input.trim(),
        self: true,
      });
      setInput("");
    }
  };

  const resizer = (dir: string, style: React.CSSProperties) => (
    <div
      style={{
        ...style,
        position: "absolute",
        zIndex: 10,
        cursor:
          dir === "right" || dir === "left"
            ? "ew-resize"
            : dir === "top" || dir === "bottom"
            ? "ns-resize"
            : dir === "top-left" || dir === "bottom-right"
            ? "nwse-resize"
            : "nesw-resize",
        userSelect: "none",
        background: "rgba(0,0,0,0.00)",
      }}
      onMouseDown={(e) => onResizeStart(dir, e)}
    />
  );

  return (
    <>
      {/* Floating Chat Icon with Tooltip */}
      <AnimatePresence>
        {!open && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                key="chat-icon"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "tween" }}
                className="fixed z-50 bottom-6 right-6"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open chat"
                  onClick={() => setOpen(true)}
                  style={{ position: "relative" }}
                >
                  <MessageCircle size={28} />
                  {unread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ef4444", // red-500
                        border: "2px solid white",
                        display: "block",
                        zIndex: 20,
                      }}
                    />
                  )}
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent sideOffset={4} side="top">
              Open chat
            </TooltipContent>
          </Tooltip>
        )}
      </AnimatePresence>

      {/* Draggable & Resizable Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-window"
            className={chatWindowStyle}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "tween" }}
            drag
            dragMomentum={false}
            dragElastic={0.18}
            dragConstraints={dragConstraintsRef}
            style={{
              touchAction: "none",
              transformOrigin: "bottom right",
              width: size.width,
              height: size.height,
              minWidth: minSize.width,
              minHeight: minSize.height,
              maxWidth: maxSize.width,
              maxHeight: maxSize.height,
              resize: "none",
              boxSizing: "border-box",
            }}
          >
            {/* Resizer handles (corners/edges) */}
            {resizer("right", {
              right: 0,
              top: 0,
              bottom: 0,
              width: 8,
            })}
            {resizer("bottom", {
              left: 0,
              right: 0,
              bottom: 0,
              height: 8,
            })}
            {resizer("left", {
              left: 0,
              top: 0,
              bottom: 0,
              width: 8,
            })}
            {resizer("top", {
              left: 0,
              right: 0,
              top: 0,
              height: 8,
            })}
            {resizer("top-left", {
              left: 0,
              top: 0,
              width: 11,
              height: 11,
            })}
            {resizer("top-right", {
              right: 0,
              top: 0,
              width: 11,
              height: 11,
            })}
            {resizer("bottom-left", {
              left: 0,
              bottom: 0,
              width: 11,
              height: 11,
            })}
            {resizer("bottom-right", {
              right: 0,
              bottom: 0,
              width: 11,
              height: 11,
            })}

            <div className={chatHeaderStyle} style={{ cursor: "move" }}>
              <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-base flex items-center gap-2">
                Chat
                {/* Connected indicator */}
                {connected ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-normal">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#22c55e",
                        display: "inline-block",
                      }}
                    />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-400 text-xs font-normal">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#a1a1aa",
                        display: "inline-block",
                      }}
                    />
                    Not connected
                  </span>
                )}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                aria-label="Close chat"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 6l8 8M6 14L14 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {error && (
              <div className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 px-4 py-2 text-xs font-medium border-b border-red-300 dark:border-red-800">
                {error}
              </div>
            )}
            <div
              ref={chatBodyRef}
              className={chatBodyStyle}
              style={{ flex: 1, overflowY: "auto" }}
            >
              {messages.length === 0 ? (
                <div className="text-zinc-400 text-center mt-8 mb-8 select-none">
                  No messages yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`max-w-[80%] px-3 py-2 rounded-lg ${
                        msg.self
                          ? "bg-blue-500 text-white self-end"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 self-start"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form className={chatInputStyle} onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-transparent outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus={open}
                disabled={false}
              />
              <button
                type="submit"
                className={`transition-colors ${
                  input.trim()
                    ? "text-blue-500 hover:text-blue-700 cursor-pointer"
                    : "text-zinc-400 cursor-not-allowed"
                }`}
                disabled={!input.trim()}
                aria-label="Send"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 10l13-5-5 13-2-6-6-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Drag constraints area (invisible, full screen) */}
      <div
        ref={dragConstraintsRef}
        className="fixed inset-0 pointer-events-none"
      />
    </>
  );
}
