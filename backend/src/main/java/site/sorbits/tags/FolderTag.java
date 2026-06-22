package site.sorbits.tags;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "sorbits_folder_tags",
        uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "folder_id", "name"}))
public class FolderTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "folder_id", nullable = false)
    private Long folderId;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, length = 7)
    private String color;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected FolderTag() {}

    public static FolderTag create(Long ownerId, Long folderId, String name, String color) {
        FolderTag t = new FolderTag();
        t.ownerId = ownerId;
        t.folderId = folderId;
        t.name = name.trim();
        t.color = color;
        t.createdAt = Instant.now();
        return t;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public Long getFolderId() {
        return folderId;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public void rename(String name) {
        this.name = name.trim();
    }

    public void setColor(String color) {
        this.color = color;
    }
}
