package site.sorbits.life;

import jakarta.persistence.*;

@Entity
@Table(name = "sorbits_task_tags")
public class TaskTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(nullable = false, length = 100)
    private String tag;

    protected TaskTag() {}

    public static TaskTag of(long taskId, String tag) {
        TaskTag t = new TaskTag();
        t.taskId = taskId;
        t.tag = tag.trim().toLowerCase();
        return t;
    }

    public Long getId() {
        return id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public String getTag() {
        return tag;
    }
}
