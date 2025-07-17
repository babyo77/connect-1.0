"use client";
import React, { useState, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useAnimationControls,
  useDragControls,
} from "motion/react";
import YouTube, { YouTubePlayer } from "react-youtube";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  PlayCircle,
  PauseCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Maximize2,
  SkipForward,
  SkipBack,
} from "lucide-react";

const videoWindowStyle =
  "fixed z-50 top-5 right-20 w-96 max-w-[90vw] bg-white dark:bg-zinc-900 rounded-xl shadow-xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800";
const videoHeaderStyle =
  "flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900";

export default function FloatingVideoPlayer() {
  const [open, setOpen] = useState(false);
  const dragConstraintsRef = useRef(null);
  const [size, setSize] = useState({ width: 480, height: 360 }); // larger default
  const minSize = { width: 480, height: 360 }; // min = default
  const maxSize = { width: 800, height: 600 };
  const resizing = useRef<{
    dir: string | null;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({ dir: null, startX: 0, startY: 0, startW: 0, startH: 0 });

  // Custom video state
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);

  // Playlist state
  const [playlist, setPlaylist] = useState<string[]>(["dQw4w9WgXcQ"]); // default video
  const [playlistInput, setPlaylistInput] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const videoWindowRef = useRef<HTMLDivElement>(null);

  const dragControls = useDragControls();

  // Helper to extract YouTube video ID from URL or ID
  function extractVideoId(url: string): string | null {
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const match = url.match(
      /(?:v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  // Add video to playlist
  const handleAddToPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(playlistInput.trim());
    if (id && !playlist.includes(id)) {
      setPlaylist((pl) => [...pl, id]);
      setPlaylistInput("");
    }
  };
  // Remove video from playlist
  const handleRemoveFromPlaylist = (idx: number) => {
    setPlaylist((pl) => pl.filter((_, i) => i !== idx));
    if (currentIndex === idx) setCurrentIndex(0);
    else if (currentIndex > idx) setCurrentIndex((i) => i - 1);
  };
  // Next/Prev
  const handleNext = () => {
    setCurrentIndex((i) => (i + 1 < playlist.length ? i + 1 : 0));
  };
  const handlePrev = () => {
    setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : playlist.length - 1));
  };
  // On video end, auto-next
  const onEnd = () => {
    setPlaying(false);
    handleNext();
  };

  // Player event handlers
  const onReady = (e: any) => {
    setPlayer(e.target);
    setDuration(e.target.getDuration());
    setVolume(e.target.getVolume());
    setMuted(e.target.isMuted());
  };
  const onPlay = () => setPlaying(true);
  const onPause = () => setPlaying(false);
  const onStateChange = (e: any) => {
    if (e.data === 1) setPlaying(true);
    if (e.data === 2) setPlaying(false);
    if (e.data === 0) setPlaying(false);
  };

  // Poll current time
  React.useEffect(() => {
    if (!player || seeking) return;
    let raf: number;
    const update = () => {
      setCurrent(player.getCurrentTime());
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [player, seeking]);

  // Seek bar change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrent(Number(e.target.value));
  };
  const handleSeekMouseUp = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (player) {
      player.seekTo(Number(e.target.value), true);
      setSeeking(false);
    }
  };
  const handleSeekMouseDown = () => setSeeking(true);

  // Play/pause
  const handlePlayPause = () => {
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  };
  // Volume
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (player) player.setVolume(v);
    if (v === 0) setMuted(true);
    else setMuted(false);
  };
  // Mute/unmute
  const handleMute = () => {
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
      setVolume(player.getVolume());
    } else {
      player.mute();
      setMuted(true);
    }
  };
  // Restart
  const handleRestart = () => {
    if (player) {
      player.seekTo(0, true);
      player.playVideo();
    }
  };

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

  // Fullscreen logic
  const handleFullscreen = () => {
    if (!videoWindowRef.current) return;
    if (!fullscreen) {
      if (videoWindowRef.current.requestFullscreen) {
        videoWindowRef.current.requestFullscreen();
      }
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setFullscreen(false);
    }
  };
  React.useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <>
      {/* Floating Video Icon with Tooltip */}
      <AnimatePresence>
        {!open && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                key="video-icon"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "tween" }}
                className="fixed z-50 top-3 right-16" // right-24 to be left of chat icon
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open video player"
                  onClick={() => setOpen(true)}
                  style={{ position: "relative" }}
                >
                  <PlayCircle size={28} />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent sideOffset={4} side="top">
              Open video player
            </TooltipContent>
          </Tooltip>
        )}
      </AnimatePresence>

      {/* Draggable & Resizable Video Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="video-window"
            ref={videoWindowRef}
            className={videoWindowStyle}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "tween" }}
            drag={!seeking}
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.18}
            dragConstraints={dragConstraintsRef}
            style={{
              touchAction: "none",
              transformOrigin: "top right",
              width: size.width,
              height: size.height,
              minWidth: minSize.width,
              minHeight: minSize.height,
              maxWidth: maxSize.width,
              maxHeight: maxSize.height,
              resize: "none",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
            }}
          >
            {/* Playlist Sidebar (toggleable) */}
            {sidebarOpen && (
              <div
                style={{
                  width: 180,
                  background: "#f4f4f5",
                  borderRight: "1px solid #e4e4e7",
                  display: "flex",
                  flexDirection: "column",
                  padding: 8,
                  gap: 8,
                  overflowY: "auto",
                  maxHeight: "100%",
                  minWidth: 0,
                }}
                className="dark:bg-zinc-800 dark:border-zinc-700"
              >
                <form
                  onSubmit={handleAddToPlaylist}
                  className="flex gap-1 mb-2"
                >
                  <input
                    type="text"
                    placeholder="YouTube URL or ID"
                    value={playlistInput}
                    onChange={(e) => setPlaylistInput(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  />
                  <button
                    type="submit"
                    className="text-blue-500 hover:text-blue-700"
                    title="Add"
                    aria-label="Add video"
                    disabled={!extractVideoId(playlistInput.trim())}
                  >
                    <Plus size={16} />
                  </button>
                </form>
                <div
                  className="flex flex-col gap-1 overflow-y-auto"
                  style={{ maxHeight: "calc(100vh - 120px)" }}
                >
                  {playlist.map((id, idx) => (
                    <div
                      key={id}
                      className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs select-none ${
                        idx === currentIndex
                          ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                          : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <span className="truncate flex-1">{id}</span>
                      <button
                        className="text-zinc-400 hover:text-red-500 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromPlaylist(idx);
                        }}
                        aria-label="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Main video area */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "#000",
                minWidth: 0,
              }}
            >
              <div
                className={videoHeaderStyle}
                style={{ cursor: "move", justifyContent: "space-between" }}
                onPointerDown={(e) => dragControls.start(e)}
              >
                <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-base flex items-center gap-2">
                  Video Player
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFullscreen}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                    title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    <Maximize2 size={16} />
                  </button>
                  <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    aria-label={sidebarOpen ? "Hide playlist" : "Show playlist"}
                    title={sidebarOpen ? "Hide playlist" : "Show playlist"}
                  >
                    {sidebarOpen ? (
                      <ChevronLeft size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                    aria-label="Close video player"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 0,
                }}
              >
                <YouTube
                  videoId={playlist[currentIndex]}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: {
                      autoplay: 0,
                      controls: 0, // Hide default controls
                      modestbranding: 1,
                      rel: 0,
                      fs: 0,
                    },
                  }}
                  onReady={onReady}
                  onPlay={onPlay}
                  onPause={onPause}
                  onEnd={onEnd}
                  onStateChange={onStateChange}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              {/* Custom Controls */}
              <div className="flex flex-col gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                {/* Seek bar */}
                <Slider
                  min={0}
                  max={duration}
                  step={0.1}
                  value={[current]}
                  onValueChange={([val]) => setCurrent(val)}
                  onValueCommit={([val]) => {
                    setSeeking(false);
                    if (player) player.seekTo(val, true);
                  }}
                  onPointerDown={() => setSeeking(true)}
                  className="w-full"
                />
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-200">
                  <span>{formatTime(current)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrev}
                      aria-label="Previous"
                      disabled={playlist.length < 2}
                    >
                      <SkipBack size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePlayPause}
                      aria-label={playing ? "Pause" : "Play"}
                    >
                      {playing ? (
                        <PauseCircle size={24} />
                      ) : (
                        <PlayCircle size={24} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNext}
                      aria-label="Next"
                      disabled={playlist.length < 2}
                    >
                      <SkipForward size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRestart}
                      aria-label="Restart"
                    >
                      <RotateCcw size={20} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMute}
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted || volume === 0 ? (
                        <VolumeX size={20} />
                      ) : (
                        <Volume2 size={20} />
                      )}
                    </Button>
                    <Slider
                      min={0}
                      max={100}
                      value={[volume]}
                      onValueChange={([v]) => {
                        setVolume(v);
                        if (player) player.setVolume(v);
                        setMuted(v === 0);
                      }}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
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
            </div>
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

// Helper to format time
function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
