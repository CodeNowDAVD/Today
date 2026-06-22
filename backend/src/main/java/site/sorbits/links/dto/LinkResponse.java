package site.sorbits.links.dto;

import site.sorbits.tags.dto.FileTagItemResponse;

import java.time.Instant;
import java.util.List;

public record LinkResponse(
        long id,
        String title,
        String url,
        Long folderId,
        Instant createdAt,
        List<FileTagItemResponse> tags) {}
