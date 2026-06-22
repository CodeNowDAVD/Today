package site.sorbits.apitoken;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_api_tokens")
public class ApiToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "token_hash", nullable = false, length = 64, columnDefinition = "CHAR(64)")
    private String tokenHash;

    @Column(name = "token_prefix", nullable = false, length = 16)
    private String tokenPrefix;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected ApiToken() {}

    public static ApiToken create(long userId, String name, String tokenHash, String tokenPrefix) {
        ApiToken t = new ApiToken();
        t.userId = userId;
        t.name = name.trim();
        t.tokenHash = tokenHash;
        t.tokenPrefix = tokenPrefix;
        t.createdAt = Instant.now();
        return t;
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

    public String getTokenHash() {
        return tokenHash;
    }

    public String getTokenPrefix() {
        return tokenPrefix;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public boolean isActive() {
        return revokedAt == null;
    }

    public void touchUsed(Instant now) {
        this.lastUsedAt = now;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
