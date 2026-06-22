package site.sorbits.notification;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_user_notifications")
public class UserNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 32)
    private String kind;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String body;

    @Column(name = "target_tab", length = 20)
    private String targetTab;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected UserNotification() {}

    public static UserNotification create(
            long userId,
            long projectId,
            String kind,
            String title,
            String body,
            String targetTab,
            Long entityId) {
        UserNotification n = new UserNotification();
        n.userId = userId;
        n.projectId = projectId;
        n.kind = kind;
        n.title = title;
        n.body = body;
        n.targetTab = targetTab;
        n.entityId = entityId;
        n.createdAt = Instant.now();
        return n;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getKind() {
        return kind;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getTargetTab() {
        return targetTab;
    }

    public Long getEntityId() {
        return entityId;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isRead() {
        return readAt != null;
    }

    public void markRead() {
        if (readAt == null) {
            readAt = Instant.now();
        }
    }
}
