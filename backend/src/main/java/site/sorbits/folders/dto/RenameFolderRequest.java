package site.sorbits.folders.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameFolderRequest(@NotBlank @Size(min = 1, max = 120) String name) {}
