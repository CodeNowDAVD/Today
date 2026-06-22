package site.sorbits.spacework.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record UpdateBoardTaskRequest(
        @Size(max = 200) String title,
        @Size(max = 1000) String description,
        Long columnId,
        @Min(0) Integer position,
        Long assigneeUserId,
        Boolean clearAssignee,
        Long linkedFileId,
        Boolean clearLinkedFile,
        Instant dueAt,
        Boolean clearDueAt,
        Boolean complete,
        Boolean reopen,
        List<String> tags) {}