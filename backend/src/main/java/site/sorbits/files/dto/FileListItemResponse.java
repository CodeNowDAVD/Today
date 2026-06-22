package site.sorbits.files.dto;

import site.sorbits.files.FileSection;
import site.sorbits.tags.dto.FileTagItemResponse;

import java.time.Instant;
import java.util.List;

public record FileListItemResponse(
        long id,
        String originalName,
        String contentType,
        long sizeBytes,
        FileSection section,
        Instant createdAt,
        String ownerUsername,
        Instant deletedAt,
        Long daysUntilPermanentDelete,
        Long folderId,
        List<FileTagItemResponse> tags) {}
