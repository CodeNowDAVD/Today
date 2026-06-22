package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProjectInvitationRepository extends JpaRepository<ProjectInvitation, Long> {

    List<ProjectInvitation> findByProjectIdAndStatusOrderByCreatedAtDesc(long projectId, InvitationStatus status);

    Optional<ProjectInvitation> findByToken(String token);

    List<ProjectInvitation> findByInviteeUserIdAndStatusOrderByCreatedAtDesc(long userId, InvitationStatus status);

    List<ProjectInvitation> findByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            String email, InvitationStatus status);

    boolean existsByProjectIdAndInviteeUserIdAndStatus(long projectId, long userId, InvitationStatus status);

    boolean existsByProjectIdAndEmailIgnoreCaseAndStatus(long projectId, String email, InvitationStatus status);

    List<ProjectInvitation> findByStatusAndExpiresAtBefore(InvitationStatus status, Instant before);
}
