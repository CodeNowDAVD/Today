package site.sorbits.notification;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.notification.dto.NotificationResponse;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class NotificationStreamHub {

    private static final long SSE_TIMEOUT_MS = 30L * 60 * 1000;

    private final Map<Long, List<SseEmitter>> byUser = new ConcurrentHashMap<>();

    public SseEmitter subscribe(long userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        byUser.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));
        return emitter;
    }

    public void broadcast(long userId, NotificationResponse notification, long unreadCount) {
        List<SseEmitter> emitters = byUser.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        Map<String, Object> payload = Map.of("notification", notification, "unreadCount", unreadCount);
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(payload));
            } catch (IOException ex) {
                remove(userId, emitter);
            }
        }
    }

    private void remove(long userId, SseEmitter emitter) {
        List<SseEmitter> emitters = byUser.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                byUser.remove(userId);
            }
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
        }
    }
}
