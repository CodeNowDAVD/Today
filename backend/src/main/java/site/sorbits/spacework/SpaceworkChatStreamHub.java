package site.sorbits.spacework;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.dto.MessageResponse;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class SpaceworkChatStreamHub {

    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> byChannel = new ConcurrentHashMap<>();

    public SpaceworkChatStreamHub(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SseEmitter subscribe(long channelId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        byChannel.computeIfAbsent(channelId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(channelId, emitter));
        emitter.onTimeout(() -> remove(channelId, emitter));
        emitter.onError(ex -> remove(channelId, emitter));
        try {
            emitter.send(SseEmitter.event().name("ready").data("ok"));
        } catch (IOException ex) {
            remove(channelId, emitter);
        }
        return emitter;
    }

    public void broadcast(long channelId, MessageResponse message) {
        List<SseEmitter> emitters = byChannel.get(channelId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        String payload;
        try {
            payload = objectMapper.writeValueAsString(message);
        } catch (JsonProcessingException ex) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("message").data(payload));
            } catch (IOException ex) {
                remove(channelId, emitter);
            }
        }
    }

    private void remove(long channelId, SseEmitter emitter) {
        List<SseEmitter> emitters = byChannel.get(channelId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            byChannel.remove(channelId, emitters);
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // already closed
        }
    }
}
