package site.sorbits.tags;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface LinkTagLinkRepository extends JpaRepository<LinkTagLink, LinkTagLink.IdKey> {

    List<LinkTagLink> findByLinkIdIn(Collection<Long> linkIds);

    void deleteByLinkId(Long linkId);

    void deleteByTagId(Long tagId);

    @Query("SELECT DISTINCT l.linkId FROM LinkTagLink l WHERE l.tagId IN :tagIds")
    List<Long> findLinkIdsWithAnyTag(@Param("tagIds") Collection<Long> tagIds);
}
