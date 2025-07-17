"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Button } from "./ui/button";
import { usePeer } from "../lib/peer-context";
import { DataConnection } from "peerjs";
import { useParams } from "next/navigation";

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
  const { peer, status } = usePeer();
  const params = useParams();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [chat, setChat] = useState<{
    connected: boolean;
    error: string | null;
    messages: Array<{ sender: string; text: string; self: boolean }>;
    unread: boolean;
    size: { width: number; height: number };
    minSize: { width: number; height: number };
    maxSize: { width: number; height: number };
  }>({
    connected: false,
    error: null,
    messages: [],
    unread: false,
    size: { width: 480, height: 520 },
    minSize: { width: 320, height: 320 },
    maxSize: { width: 640, height: 720 },
  });
  const dataConnRef = useRef<DataConnection | null>(null);
  const prevMessagesLength = useRef(0);
  const resizing = useRef<{
    dir: string | null;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({ dir: null, startX: 0, startY: 0, startW: 0, startH: 0 });

  useEffect(() => {
    if (!peer.current) return;
    peer.current.on("connection", (conn: DataConnection) => {
      if (dataConnRef.current && dataConnRef.current.open) return;
      dataConnRef.current = conn;
      setChat((c) => ({ ...c, connected: true, error: null }));
      conn.on("data", (data: any) => {
        setChat((c) => ({
          ...c,
          messages: [
            ...c.messages,
            { sender: "peer", text: String(data), self: false },
          ],
        }));
      });
      conn.on("open", () =>
        setChat((c) => ({ ...c, connected: true, error: null }))
      );
      conn.on("close", () => setChat((c) => ({ ...c, connected: false })));
      conn.on("error", (err) =>
        setChat((c) => ({
          ...c,
          connected: false,
          error:
            typeof err === "string" ? err : err?.message || "Connection error",
        }))
      );
    });
  }, [peer]);

  useEffect(() => {
    if (!peer.current) return;
    if (dataConnRef.current && dataConnRef.current.open) return;
    const peerIdToConnect = params?.id as string | undefined;
    if (
      (status.type === "connected" || status.type === "peer_connected") &&
      peerIdToConnect &&
      peer.current.id !== peerIdToConnect
    ) {
      const conn = peer.current.connect(peerIdToConnect, { label: "chat" });
      dataConnRef.current = conn;
      conn.on("data", (data: any) => {
        setChat((c) => ({
          ...c,
          messages: [
            ...c.messages,
            { sender: "peer", text: String(data), self: false },
          ],
        }));
      });
      conn.on("open", () =>
        setChat((c) => ({ ...c, connected: true, error: null }))
      );
      conn.on("close", () => setChat((c) => ({ ...c, connected: false })));
      conn.on("error", (err) =>
        setChat((c) => ({
          ...c,
          connected: false,
          error:
            typeof err === "string" ? err : err?.message || "Connection error",
        }))
      );
    }
  }, [peer, status, params]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chat.messages, open]);

  useEffect(() => {
    if (!open && chat.messages.length > prevMessagesLength.current) {
      setChat((c) => ({ ...c, unread: true }));
    }
    prevMessagesLength.current = chat.messages.length;
  }, [chat.messages, open]);

  useEffect(() => {
    if (open) setChat((c) => ({ ...c, unread: false }));
  }, [open]);

  useEffect(() => {
    if (!open) setChat((c) => ({ ...c, error: null }));
  }, [open]);

  const onResizeStart = (dir: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: chat.size.width,
      startH: chat.size.height,
    };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  };
  const onResizeMove = (e: MouseEvent) => {
    const { dir, startX, startY, startW, startH } = resizing.current;
    if (!dir) return;
    let newW = startW;
    let newH = startH;
    if (dir && dir.includes("right"))
      newW = Math.min(
        chat.maxSize.width,
        Math.max(chat.minSize.width, startW + (e.clientX - startX))
      );
    if (dir && dir.includes("left"))
      newW = Math.min(
        chat.maxSize.width,
        Math.max(chat.minSize.width, startW - (e.clientX - startX))
      );
    if (dir && dir.includes("bottom"))
      newH = Math.min(
        chat.maxSize.height,
        Math.max(chat.minSize.height, startH + (e.clientY - startY))
      );
    if (dir && dir.includes("top"))
      newH = Math.min(
        chat.maxSize.height,
        Math.max(chat.minSize.height, startH - (e.clientY - startY))
      );
    setChat((c) => ({ ...c, size: { width: newW, height: newH } }));
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
      setChat((c) => ({
        ...c,
        messages: [
          ...c.messages,
          { sender: peer.current?.id || "me", text: input.trim(), self: true },
        ],
      }));
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
        background: "rgba(0,0,0,0.01)",
      }}
      onMouseDown={(e) => onResizeStart(dir, e)}
    />
  );

  return (
    <>
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
                  {chat.unread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ef4444",
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
              width: chat.size.width,
              height: chat.size.height,
              minWidth: chat.minSize.width,
              minHeight: chat.minSize.height,
              maxWidth: chat.maxSize.width,
              maxHeight: chat.maxSize.height,
              resize: "none",
              boxSizing: "border-box",
            }}
          >
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
                {chat.connected ? (
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
            {chat.error && (
              <div className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 px-4 py-2 text-xs font-medium border-b border-red-300 dark:border-red-800">
                {chat.error}
              </div>
            )}
            <div
              ref={chatBodyRef}
              className={chatBodyStyle}
              style={{ flex: 1, overflowY: "auto" }}
            >
              {chat.messages.length === 0 ? (
                <div className="text-zinc-400 text-center mt-8 mb-8 select-none">
                  No messages yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {chat.messages.map((msg, i) => (
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
      <div
        ref={dragConstraintsRef}
        className="fixed inset-0 pointer-events-none"
      />
    </>
  );
}
