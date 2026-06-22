package site.sorbits.life;

import java.io.Serializable;
import java.util.Objects;

public class TaskContactId implements Serializable {

    private Long taskId;
    private Long contactId;

    public TaskContactId() {}

    public TaskContactId(Long taskId, Long contactId) {
        this.taskId = taskId;
        this.contactId = contactId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TaskContactId that)) return false;
        return Objects.equals(taskId, that.taskId) && Objects.equals(contactId, that.contactId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(taskId, contactId);
    }
}
