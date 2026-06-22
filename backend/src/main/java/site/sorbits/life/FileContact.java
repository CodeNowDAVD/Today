package site.sorbits.life;

import jakarta.persistence.*;

@Entity
@Table(name = "sorbits_file_contacts")
@IdClass(FileContactId.class)
public class FileContact {

    @Id
    @Column(name = "file_id")
    private Long fileId;

    @Id
    @Column(name = "contact_id")
    private Long contactId;

    protected FileContact() {}

    public static FileContact of(long fileId, long contactId) {
        FileContact fc = new FileContact();
        fc.fileId = fileId;
        fc.contactId = contactId;
        return fc;
    }

    public Long getFileId() {
        return fileId;
    }

    public Long getContactId() {
        return contactId;
    }
}
