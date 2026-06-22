package site.sorbits.tags.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateTagRequest(
        @Size(min = 1, max = 60) String name,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color inválido") String color) {}
