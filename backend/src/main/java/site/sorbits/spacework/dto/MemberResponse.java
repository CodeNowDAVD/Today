package site.sorbits.spacework.dto;

import java.time.Instant;

public record MemberResponse(long userId, String username, String role, Instant joinedAt) {}
