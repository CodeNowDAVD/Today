package site.sorbits.apitoken.dto;

import java.time.Instant;

public record ApiTokenResponse(
        long id,
        String name,
        String tokenPrefix,
        Instant createdAt,
        Instant lastUsedAt) {}
