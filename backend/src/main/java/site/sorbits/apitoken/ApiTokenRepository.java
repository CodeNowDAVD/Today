package site.sorbits.apitoken;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Long> {

    Optional<ApiToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    List<ApiToken> findByUserIdAndRevokedAtIsNullOrderByCreatedAtDesc(long userId);

    Optional<ApiToken> findByIdAndUserIdAndRevokedAtIsNull(long id, long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ApiToken t SET t.lastUsedAt = :usedAt WHERE t.id = :id")
    int updateLastUsedAt(@Param("id") long id, @Param("usedAt") Instant usedAt);
}
