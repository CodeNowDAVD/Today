package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
        name = "sorbits_project_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "user_id"}))
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProjectRole role;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    protected ProjectMember() {}

    public static ProjectMember create(Long projectId, Long userId, ProjectRole role) {
        ProjectMember m = new ProjectMember();
        m.projectId = projectId;
        m.userId = userId;
        m.role = role;
        m.joinedAt = Instant.now();
        return m;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getUserId() {
        return userId;
    }

    public ProjectRole getRole() {
        return role;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setRole(ProjectRole role) {
        this.role = role;
    }
}
