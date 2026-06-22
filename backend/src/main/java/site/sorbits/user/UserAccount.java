package site.sorbits.user;

import jakarta.persistence.*;

@Entity
@Table(name = "sorbits_users")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String username;

    @Column(unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private int status = 1;

    protected UserAccount() {}

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public int getStatus() {
        return status;
    }

    public boolean isActive() {
        return status == 1;
    }

    public static UserAccount create(String username, String passwordHash, Role role) {
        UserAccount u = new UserAccount();
        u.username = username;
        u.passwordHash = passwordHash;
        u.role = role;
        u.status = 1;
        return u;
    }

    public static UserAccount createWithEmail(
            String username, String email, String passwordHash, Role role) {
        UserAccount u = create(username, passwordHash, role);
        u.email = email == null || email.isBlank() ? null : email.trim().toLowerCase();
        return u;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public void setActive(boolean active) {
        this.status = active ? 1 : 0;
    }
}
