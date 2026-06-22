package site.sorbits.spacework.dto;

import jakarta.validation.constraints.Size;

public record UpdateWikiPageRequest(@Size(max = 200) String title, String content) {}
