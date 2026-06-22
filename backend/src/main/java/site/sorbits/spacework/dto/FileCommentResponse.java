package site.sorbits.spacework.dto;

import java.time.Instant;

public record FileCommentResponse(
        long id, long fileId, String authorUsername, String content, Instant createdAt) {}
