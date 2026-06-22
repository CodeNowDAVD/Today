package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_items")
public class ProjectItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "file_id")
    private Long fileId;

    @Column(name = "link_id")
    private Long linkId;

    @Column(name = "added_by", nullable = false)
    private Long addedBy;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt = Instant.now();

    protected ProjectItem() {}

    public static ProjectItem file(Long projectId, Long fileId, Long addedBy) {
        ProjectItem item = new ProjectItem();
        item.projectId = projectId;
        item.fileId = fileId;
        item.addedBy = addedBy;
        item.addedAt = Instant.now();
        return item;
    }

    public static ProjectItem link(Long projectId, Long linkId, Long addedBy) {
        ProjectItem item = new ProjectItem();
        item.projectId = projectId;
        item.linkId = linkId;
        item.addedBy = addedBy;
        item.addedAt = Instant.now();
        return item;
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

    public Long getLinkId() {
        return linkId;
    }

    public Long getAddedBy() {
        return addedBy;
    }

    public Instant getAddedAt() {
        return addedAt;
    }
}
