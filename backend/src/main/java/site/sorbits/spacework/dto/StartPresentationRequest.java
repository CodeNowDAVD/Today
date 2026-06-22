package site.sorbits.spacework.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StartPresentationRequest(
        @NotEmpty @Size(max = 50) List<Long> fileIds) {}
