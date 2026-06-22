package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardColumnRequest(@NotBlank @Size(max = 80) String name) {}
