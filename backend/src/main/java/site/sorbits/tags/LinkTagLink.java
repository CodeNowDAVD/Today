package site.sorbits.tags;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "sorbits_link_tags")
@IdClass(LinkTagLink.IdKey.class)
public class LinkTagLink {

    @Id
    @Column(name = "link_id")
    private Long linkId;

    @Id
    @Column(name = "tag_id")
    private Long tagId;

    protected LinkTagLink() {}

    public static LinkTagLink of(Long linkId, Long tagId) {
        LinkTagLink link = new LinkTagLink();
        link.linkId = linkId;
        link.tagId = tagId;
        return link;
    }

    public Long getLinkId() {
        return linkId;
    }

    public Long getTagId() {
        return tagId;
    }

    public static class IdKey implements Serializable {
        private Long linkId;
        private Long tagId;

        public IdKey() {}

        public IdKey(Long linkId, Long tagId) {
            this.linkId = linkId;
            this.tagId = tagId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            IdKey idKey = (IdKey) o;
            return linkId.equals(idKey.linkId) && tagId.equals(idKey.tagId);
        }

        @Override
        public int hashCode() {
            return linkId.hashCode() * 31 + tagId.hashCode();
        }
    }
}
