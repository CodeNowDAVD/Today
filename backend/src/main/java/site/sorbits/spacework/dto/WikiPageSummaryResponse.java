package site.sorbits.spacework.dto;

import java.time.Instant;

public record WikiPageSummaryResponse(
        long id, String slug, String title, String updatedByUsername, Instant updatedAt) {}
