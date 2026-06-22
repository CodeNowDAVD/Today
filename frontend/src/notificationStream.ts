import { type AppNotification } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

export function subscribeNotificationStream(
  onNotification: (notification: AppNotification, unreadCount: number) => void,
  onError: (msg: string) => void,
  onReady?: () => void,
): () => void {
  return subscribeReconnectingSseStream({
    url: "/api/v1/me/notifications/stream",
    onError,
    onBlock: (block) => {
      const { event, data } = parseSseEventBlock(block);
      if (!data) return;
      try {
        const parsed = JSON.parse(data) as {
          notification?: AppNotification;
          unreadCount?: number;
        };
        if (event === "notification" && parsed.notification != null) {
          onNotification(parsed.notification, parsed.unreadCount ?? 0);
        } else if (event === "ready") {
          onReady?.();
        }
      } catch {
        /* malformed payload */
      }
    },
  });
}
