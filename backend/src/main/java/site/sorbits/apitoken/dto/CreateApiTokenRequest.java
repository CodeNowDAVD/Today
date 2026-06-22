package site.sorbits.apitoken.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateApiTokenRequest(@NotBlank @Size(max = 80) String name) {}
