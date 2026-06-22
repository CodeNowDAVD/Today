import { type BoardTask } from "./api";
import { parseSseEventBlock } from "./sseParseBlock";
import { subscribeReconnectingSseStream } from "./sseFetchStream";

function upsertTask(list: BoardTask[], task: BoardTask): BoardTask[] {
  const next = list.filter((t) => t.id !== task.id);
  next.push(task);
  return next.sort((a, b) => a.columnId - b.columnId || a.position - b.position);
}

export function subscribeSpaceworkBoardStream(
  projectId: number,
  onTask: (task: BoardTask) => void,
  onDeleted: (taskId: number) => void,
  onError: (msg: string) => void,
  onConnected?: () => void,
): () => void {
  return subscribeReconnectingSseStream({
    url: `/api/v1/spacework/projects/${projectId}/board/stream`,
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
        if (event === "task") onTask(parsed as BoardTask);
        else if (event === "deleted" && parsed && typeof parsed === "object" && "id" in parsed) {
          onDeleted(Number((parsed as { id: number }).id));
        }
      } catch {
        /* malformed payload */
      }
    },
  });
}

export { upsertTask };
