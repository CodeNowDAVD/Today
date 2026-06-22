package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateWikiPageRequest(
        @NotBlank @Size(max = 80) String slug,
        @NotBlank @Size(max = 200) String title,
        String content) {}
