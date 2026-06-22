package site.sorbits.spacework.dto;

import java.util.List;

public record BoardResponse(List<BoardColumnResponse> columns, List<BoardTaskResponse> tasks) {}
