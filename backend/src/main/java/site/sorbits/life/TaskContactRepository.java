package site.sorbits.life;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskContactRepository extends JpaRepository<TaskContact, TaskContactId> {

    List<TaskContact> findByContactId(long contactId);

    List<TaskContact> findByTaskId(long taskId);

    boolean existsByTaskIdAndContactId(long taskId, long contactId);

    void deleteByTaskIdAndContactId(long taskId, long contactId);
}
