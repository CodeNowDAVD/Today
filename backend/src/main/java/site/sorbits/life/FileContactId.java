package site.sorbits.life;

import java.io.Serializable;
import java.util.Objects;

public class FileContactId implements Serializable {

    private Long fileId;
    private Long contactId;

    public FileContactId() {}

    public FileContactId(Long fileId, Long contactId) {
        this.fileId = fileId;
        this.contactId = contactId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FileContactId that)) return false;
        return Objects.equals(fileId, that.fileId) && Objects.equals(contactId, that.contactId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(fileId, contactId);
    }
}
