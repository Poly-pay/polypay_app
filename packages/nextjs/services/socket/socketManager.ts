import { JOIN_ACCOUNT_ROOM } from "@polypay/shared";
import { Socket, io } from "socket.io-client";
import { API_BASE_URL } from "~~/constants";

type EventCallback<T = unknown> = (data: T) => void;

interface ConnectOptions {
  accountAddress?: string;
  commitment: string;
}

class SocketManager {
  private socket: Socket | null = null;
  private currentCommitment: string | null = null;
  private currentAccountAddress: string | null = null;

  /**
   * Connect to socket server with commitment (required) and optional account
   */
  connect(options: ConnectOptions): void {
    const { commitment, accountAddress } = options;

    // Skip if already connected with same commitment
    if (this.socket?.connected && this.currentCommitment === commitment) {
      // If account changed, just switch room
      if (accountAddress && this.currentAccountAddress !== accountAddress) {
        this.joinAccount(accountAddress);
      }
      return;
    }

    // Disconnect existing connection
    if (this.socket) {
      this.disconnect();
    }

    const query: Record<string, string> = { commitment };
    if (accountAddress) {
      query.accountAddress = accountAddress;
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
    this.currentAccountAddress = accountAddress ?? null;

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
      this.currentAccountAddress = null;
      console.log("[Socket] Manually disconnected");
    }
  }

  /**
   * Switch to a different account room without reconnecting
   */
  joinAccount(accountAddress: string): void {
    if (!this.socket?.connected) {
      console.warn("[Socket] Cannot join account, socket not connected");
      return;
    }

    this.socket.emit(JOIN_ACCOUNT_ROOM, accountAddress);
    this.currentAccountAddress = accountAddress;
    console.log("[Socket] Switched to account:", accountAddress);
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
   * Get current account address
   */
  getCurrentAccountAddress(): string | null {
    return this.currentAccountAddress;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
