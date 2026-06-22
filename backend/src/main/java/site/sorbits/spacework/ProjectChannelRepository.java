package site.sorbits.spacework;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectChannelRepository extends JpaRepository<ProjectChannel, Long> {

    List<ProjectChannel> findByProjectIdOrderByIsDefaultDescNameAsc(long projectId);

    Optional<ProjectChannel> findByProjectIdAndName(long projectId, String name);

    boolean existsByProjectIdAndName(long projectId, String name);
}
