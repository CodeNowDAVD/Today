package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private boolean archived = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "workspace_kind", nullable = false, length = 20)
    private WorkspaceKind workspaceKind = WorkspaceKind.TEAM;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private WorkspaceTemplate template;

    protected Project() {}

    public static Project create(Long createdBy, String name, String description) {
        return create(createdBy, name, description, WorkspaceKind.TEAM, null);
    }

    public static Project create(
            Long createdBy,
            String name,
            String description,
            WorkspaceKind workspaceKind,
            WorkspaceTemplate template) {
        Project p = new Project();
        p.createdBy = createdBy;
        p.name = name.trim();
        p.description = description == null || description.isBlank() ? null : description.trim();
        p.createdAt = Instant.now();
        p.workspaceKind = workspaceKind == null ? WorkspaceKind.TEAM : workspaceKind;
        p.template = template;
        return p;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isArchived() {
        return archived;
    }

    public WorkspaceKind getWorkspaceKind() {
        return workspaceKind;
    }

    public WorkspaceTemplate getTemplate() {
        return template;
    }

    public void update(String name, String description) {
        this.name = name.trim();
        this.description = description == null || description.isBlank() ? null : description.trim();
    }

    public void archive() {
        this.archived = true;
    }

    public void promoteToTeam() {
        this.workspaceKind = WorkspaceKind.TEAM;
    }

    public void transferOwnership(long newOwnerId) {
        this.createdBy = newOwnerId;
    }

    public boolean isPersonal() {
        return workspaceKind == WorkspaceKind.PERSONAL;
    }
}
