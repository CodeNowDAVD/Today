package site.sorbits.notification.web;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.notification.NotificationService;
import site.sorbits.notification.NotificationStreamHub;
import site.sorbits.notification.dto.NotificationResponse;
import site.sorbits.notification.dto.UnreadCountResponse;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/notifications")
public class NotificationController {

    private final NotificationService notifications;
    private final NotificationStreamHub streamHub;

    public NotificationController(NotificationService notifications, NotificationStreamHub streamHub) {
        this.notifications = notifications;
        this.streamHub = streamHub;
    }

    @GetMapping
    public List<NotificationResponse> list(@AuthenticationPrincipal UserAccount user) {
        return notifications.list(user);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal UserAccount user) {
        return notifications.unreadCount(user);
    }

    @PostMapping("/{id}/read")
    public NotificationResponse markRead(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return notifications.markRead(user, id);
    }

    @PostMapping("/read-all")
    public UnreadCountResponse markAllRead(@AuthenticationPrincipal UserAccount user) {
        return notifications.markAllRead(user);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal UserAccount user) {
        return streamHub.subscribe(user.getId());
    }
}
