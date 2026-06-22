package site.sorbits.spacework;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.dto.FileCommentResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SpaceworkCommentStreamHub {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> byFile = new ConcurrentHashMap<>();

    public SpaceworkCommentStreamHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SseEmitter subscribe(long projectId, long fileId) {
        String key = streamKey(projectId, fileId);
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        byFile.computeIfAbsent(key, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(key, emitter));
        emitter.onTimeout(() -> remove(key, emitter));
        emitter.onError(ex -> remove(key, emitter));
        try {
            emitter.send(SseEmitter.event().name("ready").data("ok"));
        } catch (IOException ex) {
            remove(key, emitter);
        }
        return emitter;
    }

    public void broadcastComment(long projectId, long fileId, FileCommentResponse comment) {
        broadcast(projectId, fileId, "comment", comment);
    }

    public void broadcastDeleted(long projectId, long fileId, long commentId) {
        broadcast(projectId, fileId, "deleted", Map.of("id", commentId));
    }

    private void broadcast(long projectId, long fileId, String eventName, Object payload) {
        List<SseEmitter> emitters = byFile.get(streamKey(projectId, fileId));
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
                remove(streamKey(projectId, fileId), emitter);
            }
        }
    }

    private static String streamKey(long projectId, long fileId) {
        return projectId + ":" + fileId;
    }

    private void remove(String key, SseEmitter emitter) {
        List<SseEmitter> emitters = byFile.get(key);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            byFile.remove(key, emitters);
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // already closed
        }
    }
}
