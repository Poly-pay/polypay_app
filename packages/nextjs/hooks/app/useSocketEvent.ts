import { useEffect } from "react";
import { socketManager } from "~~/services/socket/socketManager";

/**
 * Hook to subscribe to socket events
 * Auto cleanup on unmount
 */
export function useSocketEvent<T = any>(event: string, callback: (data: T) => void): void {
  useEffect(() => {
    const unsubscribe = socketManager.subscribe(event, callback);

    return () => {
      unsubscribe();
    };
  }, [event, callback]);
}
