"use client";
import React, { useEffect, useRef, useState, useContext } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import { User, useUser } from "./user-context";
import localforage from "localforage";
import { useParams } from "next/navigation";

interface PeerContextType {
  peer: React.RefObject<Peer | null>;
  status: Partial<{
    type:
      | "idle"
      | "connecting"
      | "connected"
      | "error"
      | "peer_connected"
      | "permission"
      | "calling_peer"
      | "incoming_call";
    error: string;
    MediaStream: MediaStream;
  }>;
  incomingCall: MediaConnection | null;
  acceptCall: () => void;
  rejectCall: () => void;
  localStream: MediaStream | null;
  chatConn: React.MutableRefObject<DataConnection | null>; // NEW: chat DataConnection
}

const PeerContext = React.createContext<PeerContextType | undefined>(undefined);

export const PeerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state, dispatch } = useUser();
  const peerRef = useRef<Peer | null>(null);
  const chatConn = useRef<DataConnection | null>(null); // chat DataConnection

  const [status, setStatus] = useState<Partial<PeerContextType["status"]>>({
    type: "idle",
    error: "",
  });
  const [incomingCall, setIncomingCall] = useState<MediaConnection | null>(
    null
  );
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const { id } = useParams();

  const getAudioPermission = async () => {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
    });
  };
  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      setStatus({ type: "permission" });
      let stream = localStream;
      if (!stream) {
        stream = await getAudioPermission();

        setLocalStream(stream);
      }
      incomingCall.answer(stream);
      // After answering, establish chat connection if not already
      if (!chatConn.current) {
        const remotePeerId = incomingCall.peer;
        if (peerRef.current && remotePeerId) {
          const conn = peerRef.current.connect(remotePeerId, { label: "chat" });
          chatConn.current = conn;
        }
      }
    } catch (err: any) {
      setStatus({ type: "error", error: err?.message || String(err) });
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.close();
      peerRef.current?.connect(incomingCall.peer, { label: "call_rejected" });
      setStatus({ type: "connected" });
    }
  };

  useEffect(() => {
    setStatus({ type: "connecting", error: "" });

    let user: Partial<User> | null = { id: state?.id };
    localforage.getItem<Partial<User>>("user").then((data) => {
      if (user) {
        user = data;
        dispatch({ type: "SET_USER", payload: { ...user, checking: false } });
      }
    });

    if (!user?.id) {
      console.log("NO USER FOUND");
      return;
    }

    const p = new Peer(user.id, {
      debug: 2,
    });
    peerRef.current = p;

    p.on("open", async () => {
      setStatus({ type: "connected" });
      if (id) {
        try {
          setStatus({ type: "permission" });

          const stream = await getAudioPermission();
          setLocalStream(stream);

          if (!stream) {
            setStatus({ type: "error", error: "Permission denied by user" });
          }
          setStatus({ type: "calling_peer" });
          const call = p.call(id as string, stream, { metadata: user });
          setIncomingCall(call);
        } catch (err: any) {
          setStatus({ type: "error", error: err?.message || String(err) });
        }
      }
    });

    p.on("call", (call) => {
      if (incomingCall) {
        call.close();
        return;
      }

      setIncomingCall(call);

      setStatus({ type: "incoming_call" });
    });
    p.on("disconnected", () => {
      setStatus({ type: "idle" });
    });

    p.on("close", () => {
      setStatus({ type: "idle" });
    });
    p.on("connection", (conn) => {
      if (conn.label === "call_rejected") {
        conn.close();
        setStatus({ type: "error", error: "Call declined..." });
        return;
      }
      if (conn.label === "chat") {
        chatConn.current = conn;
      }
    });

    p.on("error", (err) => {
      setStatus({ type: "error", error: err?.message || String(err) });
    });

    return () => {
      p.destroy();
      setStatus({ type: "idle" });
      peerRef.current = null;
    };
  }, [state?.id, id, dispatch]);

  useEffect(() => {
    incomingCall?.on("stream", (MediaStream) => {
      dispatch({ type: "SET_USER", payload: { peerId: incomingCall.peer } });
      setStatus({ type: "peer_connected", MediaStream });
    });
    incomingCall?.on("close", async () => {
      setStatus({ type: "error", error: "Call ended" });
      // Stop local stream tracks when call ends
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (!id) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        window.location.href = "/";
      }
    });
  }, [incomingCall, id, localStream, dispatch]);

  // Listen for incoming chat connections only after call is active
  useEffect(() => {
    if (!peerRef.current) return;
    const p = peerRef.current;
    const handleConnection = (conn: DataConnection) => {
      if (conn.label === "chat") {
        chatConn.current = conn;
      }
    };
    p.on("connection", handleConnection);
    return () => {
      p.off("connection", handleConnection);
    };
  }, [peerRef.current]);

  return (
    <PeerContext.Provider
      value={{
        peer: peerRef,
        status,
        incomingCall,
        acceptCall,
        rejectCall,
        localStream,
        chatConn, // NEW: chat DataConnection
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export function usePeer() {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
}
