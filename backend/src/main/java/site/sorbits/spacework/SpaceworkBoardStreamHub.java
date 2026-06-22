package site.sorbits.spacework;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.dto.BoardTaskResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SpaceworkBoardStreamHub {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> byProject = new ConcurrentHashMap<>();

    public SpaceworkBoardStreamHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SseEmitter subscribe(long projectId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        byProject.computeIfAbsent(projectId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(projectId, emitter));
        emitter.onTimeout(() -> remove(projectId, emitter));
        emitter.onError(ex -> remove(projectId, emitter));
        try {
            emitter.send(SseEmitter.event().name("ready").data("ok"));
        } catch (IOException ex) {
            remove(projectId, emitter);
        }
        return emitter;
    }

    public void broadcastTask(long projectId, BoardTaskResponse task) {
        broadcast(projectId, "task", task);
    }

    public void broadcastDeleted(long projectId, long taskId) {
        broadcast(projectId, "deleted", Map.of("id", taskId));
    }

    private void broadcast(long projectId, String eventName, Object payload) {
        List<SseEmitter> emitters = byProject.get(projectId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        String data;
        try {
            data = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException ex) {
                remove(projectId, emitter);
            }
        }
    }

    private void remove(long projectId, SseEmitter emitter) {
        List<SseEmitter> emitters = byProject.get(projectId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            byProject.remove(projectId, emitters);
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // already closed
        }
    }
}
