package site.sorbits.life;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileContactRepository extends JpaRepository<FileContact, FileContactId> {

    List<FileContact> findByContactId(long contactId);

    List<FileContact> findByFileId(long fileId);

    boolean existsByFileIdAndContactId(long fileId, long contactId);

    void deleteByFileIdAndContactId(long fileId, long contactId);
}
