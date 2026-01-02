import { Socket, io } from "socket.io-client";
import { API_BASE_URL } from "~~/constants";

type EventCallback<T = unknown> = (data: T) => void;

interface ConnectOptions {
  walletAddress?: string;
  commitment: string;
}

class SocketManager {
  private socket: Socket | null = null;
  private currentCommitment: string | null = null;
  private currentWalletAddress: string | null = null;

  /**
   * Connect to socket server with commitment (required) and optional wallet
   */
  connect(options: ConnectOptions): void {
    const { commitment, walletAddress } = options;

    // Skip if already connected with same commitment
    if (this.socket?.connected && this.currentCommitment === commitment) {
      // If wallet changed, just switch room
      if (walletAddress && this.currentWalletAddress !== walletAddress) {
        this.joinWallet(walletAddress);
      }
      return;
    }

    // Disconnect existing connection
    if (this.socket) {
      this.disconnect();
    }

    const query: Record<string, string> = { commitment };
    if (walletAddress) {
      query.walletAddress = walletAddress;
    }

    this.socket = io(API_BASE_URL, {
      query,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.currentCommitment = commitment;
    this.currentWalletAddress = walletAddress ?? null;

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
      this.currentCommitment = null;
      this.currentWalletAddress = null;
      console.log("[Socket] Manually disconnected");
    }
  }

  /**
   * Switch to a different wallet room without reconnecting
   */
  joinWallet(walletAddress: string): void {
    if (!this.socket?.connected) {
      console.warn("[Socket] Cannot join wallet, socket not connected");
      return;
    }

    this.socket.emit("join:wallet", walletAddress);
    this.currentWalletAddress = walletAddress;
    console.log("[Socket] Switched to wallet:", walletAddress);
  }

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(event: string, callback: EventCallback<T>): () => void {
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
   * Get current commitment
   */
  getCurrentCommitment(): string | null {
    return this.currentCommitment;
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
