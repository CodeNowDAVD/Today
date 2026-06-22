package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record CreateBoardTaskRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 1000) String description,
        long columnId,
        Long assigneeUserId,
        Instant dueAt,
        List<String> tags) {}