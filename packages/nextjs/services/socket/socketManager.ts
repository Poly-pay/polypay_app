import { Socket, io } from "socket.io-client";
import { API_BASE_URL } from "~~/constants";

type EventCallback = (data: any) => void;

class SocketManager {
  private socket: Socket | null = null;
  private currentWalletAddress: string | null = null;

  /**
   * Connect to socket server and join wallet room
   */
  connect(walletAddress: string): void {
    // Skip if already connected to same wallet
    if (this.socket?.connected && this.currentWalletAddress === walletAddress) {
      return;
    }

    // Disconnect existing connection if different wallet
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(API_BASE_URL, {
      query: { walletAddress },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.currentWalletAddress = walletAddress;

    this.socket.on("connect", () => {
      console.log("[Socket] Connected:", this.socket?.id);
    });

    this.socket.on("disconnect", reason => {
      console.log("[Socket] Disconnected:", reason);
    });

    this.socket.on("connect_error", error => {
      console.error("[Socket] Connection error:", error.message);
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentWalletAddress = null;
      console.log("[Socket] Manually disconnected");
    }
  }

  /**
   * Reconnect with new wallet address
   */
  reconnect(walletAddress: string): void {
    this.disconnect();
    this.connect(walletAddress);
  }

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.socket) {
      console.warn("[Socket] Cannot subscribe, socket not connected");
      return () => {};
    }

    this.socket.on(event, callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off(event, callback);
    };
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current wallet address
   */
  getCurrentWalletAddress(): string | null {
    return this.currentWalletAddress;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
