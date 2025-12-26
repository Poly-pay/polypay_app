import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "~~/constants";
import { useIdentityStore } from "~~/services/store/useIdentityStore";

export function useSocket() {
  const { commitment } = useIdentityStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!commitment) {
      return;
    }

    // Connect with commitment as query param
    const socket = io(API_BASE_URL, {
      query: { commitment },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });

    socketRef.current = socket;

    // Cleanup on unmount or commitment change
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [commitment]);

  return socketRef.current;
}
