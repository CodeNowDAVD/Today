package site.sorbits.links.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLinkRequest(
        @NotBlank @Size(min = 1, max = 140) String title,
        @NotBlank @Size(min = 8, max = 2000) String url,
        Long folderId) {}
