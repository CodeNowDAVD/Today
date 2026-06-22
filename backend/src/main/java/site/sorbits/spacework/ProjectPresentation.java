package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_presentations")
public class ProjectPresentation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false, unique = true)
    private Long projectId;

    @Column(name = "host_user_id", nullable = false)
    private Long hostUserId;

    /** JSON array de IDs de archivo, p. ej. [12,34] */
    @Column(name = "file_ids", nullable = false, length = 2000)
    private String fileIdsJson;

    @Column(name = "current_file_index", nullable = false)
    private int currentFileIndex;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProjectPresentation() {}

    public static ProjectPresentation forProject(long projectId) {
        ProjectPresentation p = new ProjectPresentation();
        p.projectId = projectId;
        p.fileIdsJson = "[]";
        p.startedAt = Instant.now();
        p.updatedAt = Instant.now();
        return p;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getHostUserId() {
        return hostUserId;
    }

    public String getFileIdsJson() {
        return fileIdsJson;
    }

    public int getCurrentFileIndex() {
        return currentFileIndex;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void activate(long hostUserId, String fileIdsJson) {
        this.hostUserId = hostUserId;
        this.fileIdsJson = fileIdsJson;
        this.currentFileIndex = 0;
        this.active = true;
        this.startedAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void setCurrentFileIndex(int index) {
        this.currentFileIndex = index;
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }
}
