import { useEffect, useRef } from "react";
import { Socket, io } from "socket.io-client";
import { API_BASE_URL } from "~~/constants";
import { useWalletStore } from "~~/services/store";
import { useIdentityStore } from "~~/services/store/useIdentityStore";

export function useSocket() {
  const { commitment } = useIdentityStore();
  const { currentWallet } = useWalletStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!commitment) {
      return;
    }

    // Connect with walletAddress as query params
    const socket = io(API_BASE_URL, {
      query: {
        // commitment,
        walletAddress: currentWallet?.address || "",
      },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socket.on("connect_error", error => {
      console.error("[Socket] Connection error:", error.message);
    });

    socketRef.current = socket;

    // Cleanup on unmount or dependency change
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentWallet?.address]);

  return socketRef.current;
}
