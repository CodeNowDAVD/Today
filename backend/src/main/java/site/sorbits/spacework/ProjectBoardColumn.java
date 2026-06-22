package site.sorbits.spacework;

import jakarta.persistence.*;

@Entity
@Table(name = "sorbits_project_board_columns")
public class ProjectBoardColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private int position;

    protected ProjectBoardColumn() {}

    public static ProjectBoardColumn create(long projectId, String name, int position) {
        ProjectBoardColumn c = new ProjectBoardColumn();
        c.projectId = projectId;
        c.name = name.trim();
        c.position = position;
        return c;
    }

    public Long getId() {
        return id;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getName() {
        return name;
    }

    public int getPosition() {
        return position;
    }

    public void setName(String name) {
        this.name = name.trim();
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
