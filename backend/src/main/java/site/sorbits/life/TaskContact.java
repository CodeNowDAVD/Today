package site.sorbits.life;

import jakarta.persistence.*;

@Entity
@Table(name = "sorbits_task_contacts")
@IdClass(TaskContactId.class)
public class TaskContact {

    @Id
    @Column(name = "task_id")
    private Long taskId;

    @Id
    @Column(name = "contact_id")
    private Long contactId;

    protected TaskContact() {}

    public static TaskContact of(long taskId, long contactId) {
        TaskContact tc = new TaskContact();
        tc.taskId = taskId;
        tc.contactId = contactId;
        return tc;
    }

    public Long getTaskId() {
        return taskId;
    }

    public Long getContactId() {
        return contactId;
    }
}
