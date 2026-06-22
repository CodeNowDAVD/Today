package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotNull;
import site.sorbits.spacework.ProjectRole;

public record UpdateMemberRoleRequest(@NotNull ProjectRole role) {}
