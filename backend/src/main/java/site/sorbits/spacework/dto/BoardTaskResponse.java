package site.sorbits.spacework.dto;

import java.time.Instant;
import java.util.List;

public record BoardTaskResponse(
        long id,
        long columnId,
        String title,
        String description,
        int position,
        Long assigneeUserId,
        String assigneeUsername,
        Long linkedFileId,
        String linkedFileName,
        String createdByUsername,
        Instant createdAt,
        Instant updatedAt,
        Instant dueAt,
        Instant completedAt,
        List<String> tags) {}