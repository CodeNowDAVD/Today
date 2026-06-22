package site.sorbits.spacework.dto;

import java.time.Instant;

public record MessageResponse(
        long id, long channelId, String authorUsername, String content, Instant createdAt) {}
