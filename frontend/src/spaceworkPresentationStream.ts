import { type SpaceworkPresentation } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

/** SSE de presentación en vivo (Authorization vía fetch). */
export function subscribeSpaceworkPresentationStream(
  projectId: number,
  handlers: {
    onState: (state: SpaceworkPresentation) => void;
    onStopped: () => void;
    onConnected?: () => void;
    onError: (msg: string) => void;
  },
): () => void {
  return subscribeReconnectingSseStream({
    url: `/api/v1/spacework/projects/${projectId}/presentation/stream`,
    onError: handlers.onError,
    onBlock: (block) => {
      const { event, data } = parseSseEventBlock(block);
      if (event === "ready") {
        handlers.onConnected?.();
        return;
      }
      if (event === "stopped") {
        handlers.onStopped();
        return;
      }
      if (event !== "state" || !data) return;
      try {
        handlers.onState(JSON.parse(data) as SpaceworkPresentation);
      } catch {
        /* malformed payload */
      }
    },
  });
}
