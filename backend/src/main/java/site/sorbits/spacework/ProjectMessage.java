package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "sorbits_project_messages")
public class ProjectMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel_id", nullable = false)
    private Long channelId;

    @Column(name = "author_user_id", nullable = false)
    private Long authorUserId;

    @Column(nullable = false, length = 4000)
    private String content;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ProjectMessage() {}

    public static ProjectMessage create(Long channelId, Long authorUserId, String content) {
        ProjectMessage m = new ProjectMessage();
        m.channelId = channelId;
        m.authorUserId = authorUserId;
        m.content = content.trim();
        m.createdAt = Instant.now();
        return m;
    }

    public Long getId() {
        return id;
    }

    public Long getChannelId() {
        return channelId;
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
