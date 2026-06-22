package site.sorbits.spacework;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectWikiPageRepository extends JpaRepository<ProjectWikiPage, Long> {

    List<ProjectWikiPage> findByProjectIdOrderByTitleAsc(long projectId);

    Optional<ProjectWikiPage> findByProjectIdAndSlug(long projectId, String slug);

    boolean existsByProjectIdAndSlug(long projectId, String slug);

    long countByProjectId(long projectId);

    @Query(
            value =
                    """
                    SELECT w.* FROM sorbits_project_wiki_pages w
                    WHERE w.project_id IN (
                      SELECT m.project_id FROM sorbits_project_members m WHERE m.user_id = :userId
                    )
                      AND (
                        LOWER(w.title) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(CAST(w.content AS CHAR)) LIKE LOWER(CONCAT('%', :q, '%'))
                      )
                    ORDER BY w.updated_at DESC
                    """,
            nativeQuery = true)
    List<ProjectWikiPage> searchForMember(
            @Param("userId") long userId, @Param("q") String q, Pageable pageable);
}
