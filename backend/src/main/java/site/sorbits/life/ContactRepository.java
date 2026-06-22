package site.sorbits.life;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ContactRepository extends JpaRepository<Contact, Long> {

    List<Contact> findByUserIdOrderByNameAsc(long userId);

    Optional<Contact> findByIdAndUserId(long id, long userId);

    @Query(
            """
            SELECT c FROM Contact c
            WHERE c.userId = :userId
              AND (
                LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.roleLabel, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(c.notes, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY c.name ASC
            """)
    List<Contact> search(@Param("userId") long userId, @Param("q") String q);
}
