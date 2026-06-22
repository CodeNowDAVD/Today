package site.sorbits.spacework;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.dto.PresentationResponse;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SpaceworkPresentationStreamHub {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> byProject = new ConcurrentHashMap<>();

    public SpaceworkPresentationStreamHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SseEmitter subscribe(long projectId, PresentationResponse initialState) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        byProject.computeIfAbsent(projectId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(projectId, emitter));
        emitter.onTimeout(() -> remove(projectId, emitter));
        emitter.onError(ex -> remove(projectId, emitter));
        try {
            emitter.send(SseEmitter.event().name("ready").data("ok"));
            if (initialState != null && initialState.active()) {
                sendState(emitter, initialState);
            }
        } catch (IOException ex) {
            remove(projectId, emitter);
        }
        return emitter;
    }

    public void broadcastState(long projectId, PresentationResponse state) {
        List<SseEmitter> emitters = byProject.get(projectId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            sendState(emitter, state);
        }
    }

    public void broadcastStopped(long projectId) {
        List<SseEmitter> emitters = byProject.get(projectId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("stopped").data("ok"));
            } catch (IOException ex) {
                remove(projectId, emitter);
            }
        }
    }

    private void sendState(SseEmitter emitter, PresentationResponse state) {
        try {
            String payload = objectMapper.writeValueAsString(state);
            emitter.send(SseEmitter.event().name("state").data(payload));
        } catch (IOException ex) {
            // caller handles dead emitters via onError
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
