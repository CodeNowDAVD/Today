package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    Optional<ProjectMember> findByProjectIdAndUserId(long projectId, long userId);

    List<ProjectMember> findByProjectIdOrderByJoinedAtAsc(long projectId);

    List<ProjectMember> findByUserId(long userId);

    boolean existsByProjectIdAndUserId(long projectId, long userId);

    long countByProjectId(long projectId);
}
