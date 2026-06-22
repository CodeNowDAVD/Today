package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddFileCommentRequest(@NotBlank @Size(max = 2000) String content) {}
