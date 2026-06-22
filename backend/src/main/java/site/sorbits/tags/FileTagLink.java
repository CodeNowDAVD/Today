package site.sorbits.tags;

import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Table(name = "sorbits_file_tags")
@IdClass(FileTagLink.IdKey.class)
public class FileTagLink {

    @Id
    @Column(name = "file_id")
    private Long fileId;

    @Id
    @Column(name = "tag_id")
    private Long tagId;

    protected FileTagLink() {}

    public static FileTagLink of(Long fileId, Long tagId) {
        FileTagLink link = new FileTagLink();
        link.fileId = fileId;
        link.tagId = tagId;
        return link;
    }

    public Long getFileId() {
        return fileId;
    }

    public Long getTagId() {
        return tagId;
    }

    public static class IdKey implements Serializable {
        private Long fileId;
        private Long tagId;

        public IdKey() {}

        public IdKey(Long fileId, Long tagId) {
            this.fileId = fileId;
            this.tagId = tagId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            IdKey idKey = (IdKey) o;
            return fileId.equals(idKey.fileId) && tagId.equals(idKey.tagId);
        }

        @Override
        public int hashCode() {
            return fileId.hashCode() * 31 + tagId.hashCode();
        }
    }
}
