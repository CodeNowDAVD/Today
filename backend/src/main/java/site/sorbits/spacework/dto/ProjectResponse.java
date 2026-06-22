package site.sorbits.spacework.dto;

import java.time.Instant;

public record ProjectResponse(
        long id,
        String name,
        String description,
        String createdByUsername,
        Instant createdAt,
        String myRole,
        int memberCount,
        int itemCount,
        String workspaceKind,
        String template) {}