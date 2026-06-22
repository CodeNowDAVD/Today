package site.sorbits.spacework.dto;

import jakarta.validation.constraints.Min;

public record UpdatePresentationStateRequest(@Min(0) int currentFileIndex) {}
