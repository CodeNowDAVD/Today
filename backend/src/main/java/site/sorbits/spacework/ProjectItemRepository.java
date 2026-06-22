package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectItemRepository extends JpaRepository<ProjectItem, Long> {

    List<ProjectItem> findByProjectIdOrderByAddedAtDesc(long projectId);

    Optional<ProjectItem> findByProjectIdAndFileId(long projectId, long fileId);

    Optional<ProjectItem> findByProjectIdAndLinkId(long projectId, long linkId);

    long countByProjectId(long projectId);

    @Query(
            """
            SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END
            FROM ProjectItem i
            JOIN ProjectMember m ON m.projectId = i.projectId
            WHERE i.fileId = :fileId AND m.userId = :userId
            """)
    boolean memberCanAccessFile(@Param("fileId") long fileId, @Param("userId") long userId);

    void deleteByFileId(long fileId);
}
