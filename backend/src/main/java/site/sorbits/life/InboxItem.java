package site.sorbits.life;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sorbits_inbox_items")
public class InboxItem {

    public enum Kind {
        NOTE,
        TASK,
        LINK
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Kind kind = Kind.NOTE;

    @Column(nullable = false)
    private boolean processed = false;

    @Column(name = "workspace_id")
    private Long workspaceId;

    @Column(name = "converted_to_task_id")
    private Long convertedToTaskId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected InboxItem() {}

    public static InboxItem create(long userId, String content, Kind kind) {
        InboxItem item = new InboxItem();
        item.userId = userId;
        item.content = content.trim();
        item.kind = kind == null ? Kind.NOTE : kind;
        item.createdAt = Instant.now();
        item.updatedAt = Instant.now();
        return item;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getContent() {
        return content;
    }

    public Kind getKind() {
        return kind;
    }

    public boolean isProcessed() {
        return processed;
    }

    public Long getWorkspaceId() {
        return workspaceId;
    }

    public Long getConvertedToTaskId() {
        return convertedToTaskId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void markProcessed(Long workspaceId, Long convertedToTaskId) {
        this.processed = true;
        this.workspaceId = workspaceId;
        this.convertedToTaskId = convertedToTaskId;
        this.updatedAt = Instant.now();
    }

    public void updateContent(String content, Kind kind) {
        this.content = content.trim();
        if (kind != null) {
            this.kind = kind;
        }
        this.updatedAt = Instant.now();
    }
}
