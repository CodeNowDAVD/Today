package site.sorbits.spacework.dto;

import java.time.Instant;

public record ChannelResponse(
        long id, String name, String description, boolean isDefault, Instant createdAt) {}
