package site.sorbits.spacework.dto;

import java.time.Instant;

public record ActivityResponse(
        long id,
        String actorUsername,
        String activityType,
        String summary,
        Instant createdAt) {}
