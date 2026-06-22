package site.sorbits.spacework.dto;

import java.time.Instant;

public record WikiPageResponse(
        long id,
        String slug,
        String title,
        String content,
        String createdByUsername,
        String updatedByUsername,
        Instant createdAt,
        Instant updatedAt) {}
