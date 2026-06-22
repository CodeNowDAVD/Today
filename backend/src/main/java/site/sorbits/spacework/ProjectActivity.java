package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_activity")
public class ProjectActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "actor_user_id", nullable = false)
    private Long actorUserId;

    @Column(name = "activity_type", nullable = false, length = 40)
    private String activityType;

    @Column(nullable = false, length = 300)
    private String summary;

    @Column(name = "entity_type", length = 16)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ProjectActivity() {}

    public static ProjectActivity of(
            Long projectId,
            Long actorUserId,
            String activityType,
            String summary,
            String entityType,
            Long entityId) {
        ProjectActivity a = new ProjectActivity();
        a.projectId = projectId;
        a.actorUserId = actorUserId;
        a.activityType = activityType;
        a.summary = summary;
        a.entityType = entityType;
        a.entityId = entityId;
        a.createdAt = Instant.now();
        return a;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getActivityType() {
        return activityType;
    }

    public String getSummary() {
        return summary;
    }

    public String getEntityType() {
        return entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
