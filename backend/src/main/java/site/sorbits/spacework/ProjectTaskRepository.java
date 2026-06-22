package site.sorbits.spacework;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ProjectTaskRepository extends JpaRepository<ProjectTask, Long> {

    List<ProjectTask> findByProjectIdOrderByColumnIdAscPositionAsc(long projectId);

    List<ProjectTask> findByColumnIdOrderByPositionAsc(long columnId);

    Optional<ProjectTask> findByIdAndProjectId(long id, long projectId);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.projectId IN (
              SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
            )
              AND (
                LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(t.description, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY t.updatedAt DESC
            """)
    List<ProjectTask> searchForMember(
            @Param("userId") long userId, @Param("q") String q, Pageable pageable);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.projectId IN (
              SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
            )
              AND t.completedAt IS NULL
              AND t.dueAt IS NOT NULL
              AND t.dueAt < :endExclusive
              AND (:startInclusive IS NULL OR t.dueAt >= :startInclusive)
            ORDER BY t.dueAt ASC
            """)
    List<ProjectTask> findOpenTasksDueBetween(
            @Param("userId") long userId,
            @Param("startInclusive") Instant startInclusive,
            @Param("endExclusive") Instant endExclusive);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.projectId IN (
              SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
            )
              AND t.completedAt IS NULL
            ORDER BY t.dueAt ASC, t.updatedAt DESC
            """)
    List<ProjectTask> findOpenTasksForMember(@Param("userId") long userId, Pageable pageable);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.projectId IN (
              SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
            )
              AND t.completedAt IS NULL
              AND t.dueAt IS NOT NULL
              AND t.dueAt >= :from
              AND t.dueAt < :to
            ORDER BY t.dueAt ASC
            """)
    List<ProjectTask> findDueSoonForMember(
            @Param("userId") long userId, @Param("from") Instant from, @Param("to") Instant to);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.completedAt IS NULL
              AND t.dueAt IS NOT NULL
              AND t.dueAt >= :now
              AND t.dueAt < :in24h
              AND t.dueSoonNotifiedAt IS NULL
            ORDER BY t.dueAt ASC
            """)
    List<ProjectTask> findDueSoonNeedingNotification(@Param("now") Instant now, @Param("in24h") Instant in24h);

    @Query(
            """
            SELECT t FROM ProjectTask t
            WHERE t.completedAt IS NULL
              AND t.dueAt IS NOT NULL
              AND t.dueAt < :now
              AND (t.overdueNotifiedAt IS NULL OR t.overdueNotifiedAt < :startOfToday)
            ORDER BY t.dueAt ASC
            """)
    List<ProjectTask> findOverdueNeedingNotification(
            @Param("now") Instant now, @Param("startOfToday") Instant startOfToday);
}
