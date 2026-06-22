package site.sorbits.files.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameFileRequest(@NotBlank @Size(min = 1, max = 255) String name) {}
