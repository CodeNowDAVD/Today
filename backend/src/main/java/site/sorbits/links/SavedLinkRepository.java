package site.sorbits.links;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SavedLinkRepository extends JpaRepository<SavedLink, Long> {

    List<SavedLink> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    long countByOwnerId(Long ownerId);

    List<SavedLink> findByOwnerIdAndFolderIdOrderByCreatedAtDesc(Long ownerId, Long folderId);

    List<SavedLink> findByOwnerIdAndFolderIdIsNullOrderByCreatedAtDesc(Long ownerId);

    @Query(
            """
            SELECT l FROM SavedLink l
            WHERE l.ownerId = :ownerId
              AND (
                LOWER(l.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(l.url) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY l.createdAt DESC
            """)
    List<SavedLink> searchAll(@Param("ownerId") Long ownerId, @Param("q") String q);

    @Query(
            """
            SELECT l FROM SavedLink l
            WHERE l.ownerId = :ownerId AND l.folderId = :folderId
              AND (
                LOWER(l.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(l.url) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY l.createdAt DESC
            """)
    List<SavedLink> searchInFolder(
            @Param("ownerId") Long ownerId, @Param("folderId") Long folderId, @Param("q") String q);

    @Query(
            """
            SELECT l FROM SavedLink l
            WHERE l.ownerId = :ownerId AND l.folderId IS NULL
              AND (
                LOWER(l.title) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(l.url) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            ORDER BY l.createdAt DESC
            """)
    List<SavedLink> searchUncategorized(@Param("ownerId") Long ownerId, @Param("q") String q);

    Optional<SavedLink> findByIdAndOwnerId(Long id, Long ownerId);

    @Modifying
    @Query("UPDATE SavedLink l SET l.folderId = NULL WHERE l.folderId = :folderId")
    void clearFolderId(@Param("folderId") Long folderId);
}
