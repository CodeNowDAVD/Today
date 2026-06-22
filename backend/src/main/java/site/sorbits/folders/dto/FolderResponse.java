package site.sorbits.folders.dto;

import java.time.Instant;

public record FolderResponse(long id, String name, Instant createdAt, long fileCount) {}
