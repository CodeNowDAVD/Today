import { type SpaceworkFileComment } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

function appendComment(
  list: SpaceworkFileComment[],
  comment: SpaceworkFileComment,
): SpaceworkFileComment[] {
  if (list.some((c) => c.id === comment.id)) return list;
  return [...list, comment];
}

export function subscribeSpaceworkFileCommentStream(
  projectId: number,
  fileId: number,
  onComment: (comment: SpaceworkFileComment) => void,
  onDeleted: (commentId: number) => void,
  onError: (msg: string) => void,
  onConnected?: () => void,
): () => void {
  return subscribeReconnectingSseStream({
    url: `/api/v1/spacework/projects/${projectId}/files/${fileId}/comments/stream`,
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
        if (event === "comment") onComment(parsed as SpaceworkFileComment);
        else if (event === "deleted" && parsed && typeof parsed === "object" && "id" in parsed) {
          onDeleted(Number((parsed as { id: number }).id));
        }
      } catch {
        /* malformed payload */
      }
    },
  });
}

export { appendComment };
