package site.sorbits.spacework;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query(
            """
            SELECT p FROM Project p
            WHERE p.archived = false
              AND p.workspaceKind = site.sorbits.spacework.WorkspaceKind.TEAM
              AND p.id IN (
                SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
              )
            ORDER BY p.name ASC
            """)
    List<Project> findActiveTeamForMember(@Param("userId") long userId);

    @Query(
            """
            SELECT p FROM Project p
            WHERE p.archived = false
              AND p.workspaceKind = site.sorbits.spacework.WorkspaceKind.PERSONAL
              AND p.createdBy = :userId
            ORDER BY p.name ASC
            """)
    List<Project> findActivePersonalForOwner(@Param("userId") long userId);

    @Query(
            """
            SELECT p FROM Project p
            WHERE p.archived = false
              AND p.id IN (
                SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
              )
            ORDER BY p.name ASC
            """)
    List<Project> findAllActiveForMember(@Param("userId") long userId);

    default List<Project> findActiveForMember(long userId) {
        return findActiveTeamForMember(userId);
    }

    @Query(
            """
            SELECT p FROM Project p JOIN ProjectMember m ON m.projectId = p.id
            WHERE m.userId = :userId AND p.archived = false
              AND (
                LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY p.name ASC
            """)
    List<Project> searchForMember(@Param("userId") long userId, @Param("q") String q, Pageable pageable);
}
