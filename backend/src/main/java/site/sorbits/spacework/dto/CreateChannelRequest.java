package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateChannelRequest(
        @NotBlank @Size(max = 80) String name,
        @Size(max = 200) String description) {}
