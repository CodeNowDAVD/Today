package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
        name = "sorbits_project_wiki_pages",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "slug"}))
public class ProjectWikiPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "updated_by", nullable = false)
    private Long updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProjectWikiPage() {}

    public static ProjectWikiPage create(
            long projectId, String slug, String title, String content, long authorUserId) {
        ProjectWikiPage p = new ProjectWikiPage();
        p.projectId = projectId;
        p.slug = slug;
        p.title = title.trim();
        p.content = content == null ? "" : content;
        p.createdBy = authorUserId;
        p.updatedBy = authorUserId;
        p.createdAt = Instant.now();
        p.updatedAt = Instant.now();
        return p;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getSlug() {
        return slug;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(String title, String content, long editorUserId) {
        this.title = title.trim();
        this.content = content == null ? "" : content;
        this.updatedBy = editorUserId;
        this.updatedAt = Instant.now();
    }
}
