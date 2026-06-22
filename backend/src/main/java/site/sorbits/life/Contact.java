package site.sorbits.life;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sorbits_contacts")
public class Contact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Column(name = "role_label", length = 100)
    private String roleLabel;

    @Column(length = 255)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Contact() {}

    public static Contact create(long userId, String name, String roleLabel, String email, String notes) {
        Contact c = new Contact();
        c.userId = userId;
        c.name = name.trim();
        c.roleLabel = blankToNull(roleLabel);
        c.email = blankToNull(email);
        c.notes = blankToNull(notes);
        c.createdAt = Instant.now();
        return c;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getRoleLabel() {
        return roleLabel;
    }

    public String getEmail() {
        return email;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void update(String name, String roleLabel, String email, String notes) {
        this.name = name.trim();
        this.roleLabel = blankToNull(roleLabel);
        this.email = blankToNull(email);
        this.notes = blankToNull(notes);
    }
}
