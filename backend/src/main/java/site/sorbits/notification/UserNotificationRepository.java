package site.sorbits.notification;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserNotificationRepository extends JpaRepository<UserNotification, Long> {

    List<UserNotification> findByUserIdOrderByCreatedAtDesc(long userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(long userId);

    Optional<UserNotification> findByIdAndUserId(long id, long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE UserNotification n SET n.readAt = :now WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllRead(@Param("userId") long userId, @Param("now") Instant now);
}
