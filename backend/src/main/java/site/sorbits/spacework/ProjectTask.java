package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_tasks")
public class ProjectTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "column_id", nullable = false)
    private Long columnId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private int position;

    @Column(name = "assignee_user_id")
    private Long assigneeUserId;

    @Column(name = "linked_file_id")
    private Long linkedFileId;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "due_soon_notified_at")
    private Instant dueSoonNotifiedAt;

    @Column(name = "overdue_notified_at")
    private Instant overdueNotifiedAt;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProjectTask() {}

    public static ProjectTask create(
            long projectId, long columnId, String title, String description, int position, Long assigneeUserId, long createdBy) {
        ProjectTask t = new ProjectTask();
        t.projectId = projectId;
        t.columnId = columnId;
        t.title = title.trim();
        t.description = description == null || description.isBlank() ? null : description.trim();
        t.position = position;
        t.assigneeUserId = assigneeUserId;
        t.createdBy = createdBy;
        t.createdAt = Instant.now();
        t.updatedAt = Instant.now();
        return t;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getColumnId() {
        return columnId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public int getPosition() {
        return position;
    }

    public Long getAssigneeUserId() {
        return assigneeUserId;
    }

    public Long getLinkedFileId() {
        return linkedFileId;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getDueSoonNotifiedAt() {
        return dueSoonNotifiedAt;
    }

    public Instant getOverdueNotifiedAt() {
        return overdueNotifiedAt;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isCompleted() {
        return completedAt != null;
    }

    public void setColumnId(long columnId) {
        this.columnId = columnId;
        this.updatedAt = Instant.now();
    }

    public void setTitle(String title) {
        this.title = title.trim();
        this.updatedAt = Instant.now();
    }

    public void setDescription(String description) {
        this.description = description == null || description.isBlank() ? null : description.trim();
        this.updatedAt = Instant.now();
    }

    public void setPosition(int position) {
        this.position = position;
        this.updatedAt = Instant.now();
    }

    public void setAssigneeUserId(Long assigneeUserId) {
        this.assigneeUserId = assigneeUserId;
        this.updatedAt = Instant.now();
    }

    public void setLinkedFileId(Long linkedFileId) {
        this.linkedFileId = linkedFileId;
        this.updatedAt = Instant.now();
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
        this.updatedAt = Instant.now();
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
        this.updatedAt = Instant.now();
    }

    public void markCompleted() {
        setCompletedAt(Instant.now());
    }

    public void markIncomplete() {
        setCompletedAt(null);
    }

    public void markDueSoonNotified(Instant at) {
        this.dueSoonNotifiedAt = at;
        this.updatedAt = Instant.now();
    }

    public void markOverdueNotified(Instant at) {
        this.overdueNotifiedAt = at;
        this.updatedAt = Instant.now();
    }
}
