package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import site.sorbits.spacework.ProjectRole;

public record AddMemberRequest(@NotBlank String username, @NotNull ProjectRole role) {}
