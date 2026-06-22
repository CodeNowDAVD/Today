package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_file_comments")
public class ProjectFileComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "file_id", nullable = false)
    private Long fileId;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(nullable = false, length = 2000)
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ProjectFileComment() {}

    public static ProjectFileComment create(Long projectId, Long fileId, Long authorUserId, String content) {
        ProjectFileComment c = new ProjectFileComment();
        c.projectId = projectId;
        c.fileId = fileId;
        c.authorUserId = authorUserId;
        c.content = content.trim();
        c.createdAt = Instant.now();
        return c;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getFileId() {
        return fileId;
    }

    public Long getAuthorUserId() {
        return authorUserId;
    }

    public String getContent() {
        return content;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
