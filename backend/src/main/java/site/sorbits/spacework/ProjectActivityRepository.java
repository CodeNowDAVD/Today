package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, Long> {

    List<ProjectActivity> findTop50ByProjectIdOrderByCreatedAtDesc(long projectId);
}
