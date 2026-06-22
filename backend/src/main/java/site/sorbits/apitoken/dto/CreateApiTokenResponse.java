package site.sorbits.apitoken.dto;

import java.time.Instant;

public record CreateApiTokenResponse(
        long id,
        String name,
        String token,
        String tokenPrefix,
        Instant createdAt) {}
