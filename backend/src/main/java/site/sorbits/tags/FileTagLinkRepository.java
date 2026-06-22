package site.sorbits.tags;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface FileTagLinkRepository extends JpaRepository<FileTagLink, FileTagLink.IdKey> {

    List<FileTagLink> findByFileId(Long fileId);

    List<FileTagLink> findByFileIdIn(Collection<Long> fileIds);

    void deleteByFileId(Long fileId);

    void deleteByTagId(Long tagId);

    @Query("SELECT DISTINCT l.fileId FROM FileTagLink l WHERE l.tagId IN :tagIds")
    List<Long> findFileIdsWithAnyTag(@Param("tagIds") Collection<Long> tagIds);
}
