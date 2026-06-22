package site.sorbits.files;

import jakarta.persistence.*;
import site.sorbits.user.UserAccount;

import java.time.Instant;

@Entity
@Table(name = "sorbits_files")
public class StoredFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "stored_name", nullable = false, length = 120)
    private String storedName;

    @Column(name = "content_type", length = 120)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FileSection section;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "folder_id")
    private Long folderId;

    protected StoredFile() {}

    public static StoredFile create(
            Long ownerId,
            String originalName,
            String storedName,
            String contentType,
            long sizeBytes,
            FileSection section,
            Long folderId) {
        StoredFile f = new StoredFile();
        f.ownerId = ownerId;
        f.originalName = originalName;
        f.storedName = storedName;
        f.contentType = contentType;
        f.sizeBytes = sizeBytes;
        f.section = section;
        f.folderId = folderId;
        f.createdAt = Instant.now();
        return f;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getStoredName() {
        return storedName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public FileSection getSection() {
        return section;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public boolean isTrashed() {
        return deletedAt != null;
    }

    public void moveToTrash() {
        this.deletedAt = Instant.now();
    }

    public void restoreFromTrash() {
        this.deletedAt = null;
    }

    public Long getFolderId() {
        return folderId;
    }

    public void setFolderId(Long folderId) {
        this.folderId = folderId;
    }

    public void rename(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Nombre inválido");
        }
        String trimmed = name.trim();
        if (trimmed.contains("/") || trimmed.contains("\\")) {
            throw new IllegalArgumentException("El nombre no puede contener / ni \\");
        }
        this.originalName = trimmed;
    }

    public void updateContent(String contentType, long sizeBytes) {
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("Tipo de contenido inválido");
        }
        if (sizeBytes < 1) {
            throw new IllegalArgumentException("Tamaño inválido");
        }
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
    }
}
