package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
        name = "sorbits_project_channels",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "name"}))
public class ProjectChannel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ProjectChannel() {}

    public static ProjectChannel create(Long projectId, String name, String description, boolean isDefault) {
        ProjectChannel c = new ProjectChannel();
        c.projectId = projectId;
        c.name = name.trim().toLowerCase();
        c.description = description == null || description.isBlank() ? null : description.trim();
        c.isDefault = isDefault;
        c.createdAt = Instant.now();
        return c;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
