package site.sorbits.folders;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "sorbits_folders",
        uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "name"}))
public class UserFolder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected UserFolder() {}

    public static UserFolder create(Long ownerId, String name) {
        UserFolder f = new UserFolder();
        f.ownerId = ownerId;
        f.name = name.trim();
        f.createdAt = Instant.now();
        return f;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getName() {
        return name;
    }

    public void rename(String name) {
        this.name = name.trim();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
