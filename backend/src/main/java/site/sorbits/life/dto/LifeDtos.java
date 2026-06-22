package site.sorbits.life.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import site.sorbits.life.InboxItem;

import java.time.Instant;
import java.util.List;

public final class LifeDtos {

    private LifeDtos() {}

    public record LifeWorkspaceResponse(
            long id,
            String name,
            String description,
            String workspaceKind,
            String template,
            String createdByUsername,
            Instant createdAt,
            int itemCount) {}

    public record CreateLifeWorkspaceRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String description,
            String template) {}

    public record LifeTaskSummary(
            long id,
            long workspaceId,
            String workspaceName,
            String workspaceKind,
            long columnId,
            String columnName,
            String title,
            String description,
            Instant dueAt,
            Instant completedAt,
            Long linkedFileId,
            String linkedFileName,
            List<String> tags,
            /** OVERDUE | TODAY | SOON | LATER | NONE — calculado en servidor cuando aplica. */
            String dueBucket) {}

    public record TodayMeta(
            String timezone,
            Instant asOf,
            Instant startOfToday,
            Instant startOfTomorrow,
            int soonDaysWindow,
            int upcomingDaysWindow) {}

    public record TodayResponse(
            TodayMeta meta,
            List<LifeTaskSummary> tasksOverdue,
            List<LifeTaskSummary> tasksDueToday,
            List<LifeTaskSummary> tasksDueSoon,
            List<InboxItemResponse> inboxPending,
            List<RecentFileResponse> recentFiles,
            List<LifeWorkspaceResponse> activeWorkspaces,
            long inboxPendingCount) {}

    public record RecentFileResponse(long id, String name, String contentType, Instant updatedAt) {}

    public record InboxItemResponse(
            long id, String content, String kind, boolean processed, Instant createdAt) {

        public static InboxItemResponse from(InboxItem item) {
            return new InboxItemResponse(
                    item.getId(),
                    item.getContent(),
                    item.getKind().name(),
                    item.isProcessed(),
                    item.getCreatedAt());
        }
    }

    public record CreateInboxRequest(@NotBlank String content, String kind) {}

    public record PatchInboxRequest(
            Boolean processed,
            Long workspaceId,
            String convertToTaskTitle,
            Long convertToTaskColumnId,
            Instant convertToTaskDueAt) {}

    public record ContactResponse(
            long id, String name, String roleLabel, String email, String notes, Instant createdAt) {}

    public record CreateContactRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 100) String roleLabel,
            @Size(max = 255) String email,
            String notes) {}

    public record UpdateContactRequest(
            @Size(max = 255) String name,
            @Size(max = 100) String roleLabel,
            @Size(max = 255) String email,
            String notes) {}

    public record ContactLinkedResponse(
            ContactResponse contact,
            List<LifeTaskSummary> tasks,
            List<RecentFileResponse> files) {}

    public record PromoteWorkspaceResponse(long id, String workspaceKind) {}

    public record SetTaskContactsRequest(List<Long> contactIds) {}
}
