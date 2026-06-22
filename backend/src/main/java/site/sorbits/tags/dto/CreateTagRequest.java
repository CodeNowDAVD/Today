package site.sorbits.tags.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTagRequest(@NotBlank @Size(min = 1, max = 60) String name, String color) {}
