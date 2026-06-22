package site.sorbits.folders;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserFolderRepository extends JpaRepository<UserFolder, Long> {

    List<UserFolder> findByOwnerIdOrderByNameAsc(Long ownerId);

    long countByOwnerId(Long ownerId);

    Optional<UserFolder> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByOwnerIdAndNameIgnoreCase(Long ownerId, String name);

    java.util.Optional<UserFolder> findByOwnerIdAndNameIgnoreCase(Long ownerId, String name);
}
