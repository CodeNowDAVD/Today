package site.sorbits.spacework;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMessageRepository extends JpaRepository<ProjectMessage, Long> {

    List<ProjectMessage> findByChannelIdOrderByCreatedAtDesc(long channelId, Pageable pageable);
}
