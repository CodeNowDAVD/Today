package site.sorbits.links;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_links")
public class SavedLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(nullable = false, length = 2000)
    private String url;

    @Column(name = "folder_id")
    private Long folderId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected SavedLink() {}

    public static SavedLink create(Long ownerId, Long folderId, String title, String url) {
        SavedLink link = new SavedLink();
        link.ownerId = ownerId;
        link.folderId = folderId;
        link.title = title.trim();
        link.url = url.trim();
        link.createdAt = Instant.now();
        return link;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getTitle() {
        return title;
    }

    public String getUrl() {
        return url;
    }

    public Long getFolderId() {
        return folderId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void update(String title, String url) {
        this.title = title.trim();
        this.url = url.trim();
    }

    public void setFolderId(Long folderId) {
        this.folderId = folderId;
    }
}
