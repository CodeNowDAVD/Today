package site.sorbits.spacework.dto;

import java.time.Instant;
import java.util.List;

public record PresentationResponse(
        boolean active,
        long hostUserId,
        String hostUsername,
        List<Long> fileIds,
        int currentFileIndex,
        Instant startedAt,
        Instant updatedAt) {

    public static PresentationResponse inactive() {
        return new PresentationResponse(false, 0L, "", List.of(), 0, Instant.EPOCH, Instant.EPOCH);
    }
}
