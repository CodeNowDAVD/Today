package site.sorbits.spacework.dto;

import java.time.Instant;

public record ProjectItemResponse(
        long id,
        String kind,
        Long fileId,
        String fileName,
        String fileContentType,
        Long fileSizeBytes,
        String fileOwnerUsername,
        Long linkId,
        String linkTitle,
        String linkUrl,
        String addedByUsername,
        Instant addedAt) {}
