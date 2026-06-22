package site.sorbits.spacework;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sorbits_project_invitations")
public class ProjectInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "inviter_id", nullable = false)
    private Long inviterId;

    @Column(name = "invitee_user_id")
    private Long inviteeUserId;

    @Column(length = 255)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectRole role = ProjectRole.MEMBER;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ProjectInvitation() {}

    public static ProjectInvitation forEmail(
            long projectId, long inviterId, String email, ProjectRole role, Instant expiresAt) {
        ProjectInvitation inv = new ProjectInvitation();
        inv.projectId = projectId;
        inv.inviterId = inviterId;
        inv.email = email.trim().toLowerCase();
        inv.role = role;
        inv.token = UUID.randomUUID().toString().replace("-", "");
        inv.expiresAt = expiresAt;
        return inv;
    }

    public static ProjectInvitation forUser(
            long projectId, long inviterId, long inviteeUserId, ProjectRole role, Instant expiresAt) {
        ProjectInvitation inv = new ProjectInvitation();
        inv.projectId = projectId;
        inv.inviterId = inviterId;
        inv.inviteeUserId = inviteeUserId;
        inv.role = role;
        inv.token = UUID.randomUUID().toString().replace("-", "");
        inv.expiresAt = expiresAt;
        return inv;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public Long getInviterId() {
        return inviterId;
    }

    public Long getInviteeUserId() {
        return inviteeUserId;
    }

    public String getEmail() {
        return email;
    }

    public ProjectRole getRole() {
        return role;
    }

    public String getToken() {
        return token;
    }

    public InvitationStatus getStatus() {
        return status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void markAccepted() {
        this.status = InvitationStatus.ACCEPTED;
    }

    public void markDeclined() {
        this.status = InvitationStatus.DECLINED;
    }

    public void markExpired() {
        this.status = InvitationStatus.EXPIRED;
    }

    public boolean isPending() {
        return status == InvitationStatus.PENDING;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
