import { type WikiPage } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

export function subscribeSpaceworkWikiStream(
  projectId: number,
  onPage: (page: WikiPage) => void,
  onDeleted: (slug: string) => void,
  onError: (msg: string) => void,
  onConnected?: () => void,
): () => void {
  return subscribeReconnectingSseStream({
    url: `/api/v1/spacework/projects/${projectId}/wiki/stream`,
    onError,
    onBlock: (block) => {
      const { event, data } = parseSseEventBlock(block);
      if (event === "ready") {
        onConnected?.();
        return;
      }
      if (!data) return;
      try {
        const parsed = JSON.parse(data) as unknown;
        if (event === "page") onPage(parsed as WikiPage);
        else if (event === "deleted" && parsed && typeof parsed === "object" && "slug" in parsed) {
          onDeleted(String((parsed as { slug: string }).slug));
        }
      } catch {
        /* malformed payload */
      }
    },
  });
}
