package site.sorbits.files;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long>, JpaSpecificationExecutor<StoredFile> {

    @org.springframework.data.jpa.repository.Query(
            "SELECT f.createdAt FROM StoredFile f WHERE f.section = :section AND f.deletedAt IS NULL"
                    + " AND (:ownerId IS NULL OR f.ownerId = :ownerId)"
                    + " AND ((:uncategorizedOnly = true AND f.folderId IS NULL)"
                    + " OR (:uncategorizedOnly = false AND (:folderId IS NULL OR f.folderId = :folderId)))"
                    + " AND f.createdAt >= :from AND f.createdAt < :to")
    java.util.List<java.time.Instant> findActiveCreatedAtInRange(
            @org.springframework.data.repository.query.Param("section") FileSection section,
            @org.springframework.data.repository.query.Param("ownerId") Long ownerId,
            @org.springframework.data.repository.query.Param("folderId") Long folderId,
            @org.springframework.data.repository.query.Param("uncategorizedOnly") boolean uncategorizedOnly,
            @org.springframework.data.repository.query.Param("from") java.time.Instant from,
            @org.springframework.data.repository.query.Param("to") java.time.Instant to);

    @org.springframework.data.jpa.repository.Query(
            "SELECT f.deletedAt FROM StoredFile f WHERE f.section = :section AND f.deletedAt IS NOT NULL"
                    + " AND (:ownerId IS NULL OR f.ownerId = :ownerId)"
                    + " AND f.deletedAt >= :from AND f.deletedAt < :to")
    java.util.List<java.time.Instant> findTrashDeletedAtInRange(
            @org.springframework.data.repository.query.Param("section") FileSection section,
            @org.springframework.data.repository.query.Param("ownerId") Long ownerId,
            @org.springframework.data.repository.query.Param("from") java.time.Instant from,
            @org.springframework.data.repository.query.Param("to") java.time.Instant to);

    List<StoredFile> findBySectionAndDeletedAtIsNullOrderByCreatedAtDesc(FileSection section);

    List<StoredFile> findBySectionAndDeletedAtIsNotNullOrderByDeletedAtDesc(FileSection section);

    List<StoredFile> findByOwnerIdAndSectionAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long ownerId, FileSection section);

    List<StoredFile> findByOwnerIdAndSectionAndDeletedAtIsNotNullOrderByDeletedAtDesc(
            Long ownerId, FileSection section);

    List<StoredFile> findByOwnerIdAndSectionAndFolderIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long ownerId, FileSection section, Long folderId);

    List<StoredFile> findByOwnerIdAndSectionAndFolderIdIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long ownerId, FileSection section);

    List<StoredFile> findBySectionAndFolderIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            FileSection section, Long folderId);

    List<StoredFile> findBySectionAndFolderIdIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(FileSection section);

    long countByOwnerIdAndFolderIdAndSectionAndDeletedAtIsNull(
            Long ownerId, Long folderId, FileSection section);

    long countByOwnerId(Long ownerId);

    List<StoredFile> findByDeletedAtBefore(Instant before);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE StoredFile f SET f.folderId = NULL WHERE f.folderId = :folderId")
    int clearFolderId(@Param("folderId") Long folderId);

    @Query(
            """
            SELECT DISTINCT f FROM StoredFile f
            WHERE f.deletedAt IS NULL
              AND LOWER(f.originalName) LIKE LOWER(CONCAT('%', :q, '%'))
              AND (
                f.ownerId = :userId
                OR EXISTS (
                  SELECT 1 FROM ProjectItem i, ProjectMember m
                  WHERE i.fileId = f.id AND m.projectId = i.projectId AND m.userId = :userId
                )
              )
            ORDER BY f.createdAt DESC
            """)
    List<StoredFile> searchAccessible(
            @Param("userId") long userId, @Param("q") String q, Pageable pageable);
}
