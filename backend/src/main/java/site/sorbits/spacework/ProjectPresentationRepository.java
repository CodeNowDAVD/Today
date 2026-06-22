package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectPresentationRepository extends JpaRepository<ProjectPresentation, Long> {

    Optional<ProjectPresentation> findByProjectId(long projectId);

    Optional<ProjectPresentation> findByProjectIdAndActiveTrue(long projectId);
}
