import { type SpaceworkMessage } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

function appendMessage(list: SpaceworkMessage[], msg: SpaceworkMessage): SpaceworkMessage[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

/** SSE con Authorization header (fetch + stream). Devuelve función para cerrar. */
export function subscribeSpaceworkChatStream(
  projectId: number,
  channelId: number,
  onMessage: (msg: SpaceworkMessage) => void,
  onError: (msg: string) => void,
  onConnected?: () => void,
): () => void {
  return subscribeReconnectingSseStream({
    url: `/api/v1/spacework/projects/${projectId}/channels/${channelId}/stream`,
    onError,
    onBlock: (block) => {
      const { event, data } = parseSseEventBlock(block);
      if (event === "ready") {
        onConnected?.();
        return;
      }
      if (event !== "message" || !data) return;
      try {
        onMessage(JSON.parse(data) as SpaceworkMessage);
      } catch {
        /* malformed payload */
      }
    },
  });
}

export { appendMessage };
