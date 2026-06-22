package site.sorbits.life;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InboxItemRepository extends JpaRepository<InboxItem, Long> {

    List<InboxItem> findByUserIdAndProcessedFalseOrderByCreatedAtDesc(long userId);

    Optional<InboxItem> findByIdAndUserId(long id, long userId);

    long countByUserIdAndProcessedFalse(long userId);

    @Query(
            """
            SELECT i FROM InboxItem i
            WHERE i.userId = :userId AND i.processed = false
              AND LOWER(i.content) LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY i.createdAt DESC
            """)
    List<InboxItem> searchPending(@Param("userId") long userId, @Param("q") String q);
}
