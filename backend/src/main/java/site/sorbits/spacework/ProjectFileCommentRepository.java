package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectFileCommentRepository extends JpaRepository<ProjectFileComment, Long> {

    List<ProjectFileComment> findByProjectIdAndFileIdOrderByCreatedAtAsc(long projectId, long fileId);

    Optional<ProjectFileComment> findByIdAndProjectIdAndFileId(long id, long projectId, long fileId);

    void deleteByFileId(long fileId);
}
