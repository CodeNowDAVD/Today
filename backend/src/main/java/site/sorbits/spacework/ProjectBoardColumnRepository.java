package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectBoardColumnRepository extends JpaRepository<ProjectBoardColumn, Long> {

    List<ProjectBoardColumn> findByProjectIdOrderByPositionAsc(long projectId);

    long countByProjectId(long projectId);
}
