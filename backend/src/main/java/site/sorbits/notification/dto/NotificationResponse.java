package site.sorbits.notification.dto;

import java.time.Instant;

public record NotificationResponse(
        long id,
        String kind,
        String title,
        String body,
        long projectId,
        String projectName,
        String targetTab,
        Long entityId,
        boolean read,
        Instant createdAt) {}
