package site.sorbits.spacework.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import site.sorbits.spacework.InvitationStatus;
import site.sorbits.spacework.ProjectInvitation;

import java.time.Instant;

public final class InvitationDtos {

    private InvitationDtos() {}

    public record CreateInvitationRequest(
            String username,
            @Email @Size(max = 255) String email,
            String role) {}

    public record InvitationResponse(
            long id,
            long projectId,
            String projectName,
            String inviterUsername,
            String inviteeUsername,
            String email,
            String role,
            String status,
            String token,
            String inviteUrl,
            Instant expiresAt,
            Instant createdAt) {

        public static InvitationResponse from(
                ProjectInvitation inv,
                String projectName,
                String inviterUsername,
                String inviteeUsername,
                String publicBaseUrl) {
            String url = publicBaseUrl + "/?invite=" + inv.getToken();
            return new InvitationResponse(
                    inv.getId(),
                    inv.getProjectId(),
                    projectName,
                    inviterUsername,
                    inviteeUsername,
                    inv.getEmail(),
                    inv.getRole().name(),
                    inv.getStatus().name(),
                    inv.getToken(),
                    url,
                    inv.getExpiresAt(),
                    inv.getCreatedAt());
        }

        /** Listados: sin token ni URL reutilizable (evita filtración en XSS/sesión comprometida). */
        public static InvitationResponse fromSummary(
                ProjectInvitation inv,
                String projectName,
                String inviterUsername,
                String inviteeUsername) {
            return new InvitationResponse(
                    inv.getId(),
                    inv.getProjectId(),
                    projectName,
                    inviterUsername,
                    inviteeUsername,
                    inv.getEmail(),
                    inv.getRole().name(),
                    inv.getStatus().name(),
                    null,
                    null,
                    inv.getExpiresAt(),
                    inv.getCreatedAt());
        }
    }

    public record InvitationPreviewResponse(
            long invitationId,
            long projectId,
            String projectName,
            String inviterUsername,
            String role,
            String status,
            String email,
            boolean expired,
            boolean registrationRequired) {}

    public record TransferOwnershipRequest(long newOwnerId) {}
}
