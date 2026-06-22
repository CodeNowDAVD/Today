package site.sorbits.files.dto;

import java.util.List;

public record PagedFileListResponse(
        List<FileListItemResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {}
