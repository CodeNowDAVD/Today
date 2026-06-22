package site.sorbits.tags;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FolderTagRepository extends JpaRepository<FolderTag, Long> {

    List<FolderTag> findByOwnerIdAndFolderIdOrderByNameAsc(Long ownerId, Long folderId);

    List<FolderTag> findByOwnerIdAndFolderIdInOrderByFolderIdAscNameAsc(Long ownerId, Collection<Long> folderIds);

    List<FolderTag> findByOwnerIdAndNameContainingIgnoreCase(Long ownerId, String nameFragment);

    Optional<FolderTag> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByOwnerIdAndFolderIdAndNameIgnoreCase(Long ownerId, Long folderId, String name);

    boolean existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndIdNot(
            Long ownerId, Long folderId, String name, Long id);

    long countByOwnerIdAndFolderId(Long ownerId, Long folderId);
}
