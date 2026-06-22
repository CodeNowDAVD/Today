package site.sorbits.life;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface TaskTagRepository extends JpaRepository<TaskTag, Long> {

    List<TaskTag> findByTaskIdIn(Collection<Long> taskIds);

    List<TaskTag> findByTaskId(long taskId);

    void deleteByTaskId(long taskId);

    @Query(
            """
            SELECT DISTINCT t.tag FROM TaskTag t
            WHERE t.taskId IN (
              SELECT tk.id FROM ProjectTask tk
              WHERE tk.projectId IN (
                SELECT m.projectId FROM ProjectMember m WHERE m.userId = :userId
              )
            )
            AND LOWER(t.tag) LIKE LOWER(CONCAT(:prefix, '%'))
            ORDER BY t.tag ASC
            """)
    List<String> suggestTags(@Param("userId") long userId, @Param("prefix") String prefix);
}
