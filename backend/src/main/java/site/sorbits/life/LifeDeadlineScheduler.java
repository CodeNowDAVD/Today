package site.sorbits.life;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.Project;
import site.sorbits.spacework.ProjectRepository;
import site.sorbits.spacework.ProjectTask;
import site.sorbits.spacework.ProjectTaskRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class LifeDeadlineScheduler {

    private final ProjectTaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notifications;
    private final ZoneId zoneId;

    public LifeDeadlineScheduler(
            ProjectTaskRepository taskRepository,
            ProjectRepository projectRepository,
            NotificationService notifications,
            @org.springframework.beans.factory.annotation.Value("${app.timezone:America/Mexico_City}")
                    String timezone) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.notifications = notifications;
        this.zoneId = ZoneId.of(timezone);
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "${app.timezone:America/Mexico_City}")
    @Transactional
    public void notifyDueSoon() {
        Instant now = Instant.now();
        Instant in24h = now.plus(24, ChronoUnit.HOURS);
        List<ProjectTask> tasks = taskRepository.findDueSoonNeedingNotification(now, in24h);
        notifyTasks(tasks, true);
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "${app.timezone:America/Mexico_City}")
    @Transactional
    public void notifyOverdue() {
        Instant now = Instant.now();
        Instant startOfToday =
                ZonedDateTime.now(zoneId).toLocalDate().atStartOfDay(zoneId).toInstant();
        List<ProjectTask> tasks = taskRepository.findOverdueNeedingNotification(now, startOfToday);
        notifyTasks(tasks, false);
    }

    private void notifyTasks(List<ProjectTask> tasks, boolean dueSoon) {
        if (tasks.isEmpty()) {
            return;
        }
        Set<Long> projectIds = tasks.stream().map(ProjectTask::getProjectId).collect(Collectors.toSet());
        Map<Long, String> projectNames = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));
        Instant notifiedAt = Instant.now();
        for (ProjectTask task : tasks) {
            long userId = task.getAssigneeUserId() != null ? task.getAssigneeUserId() : task.getCreatedBy();
            String projectName = projectNames.getOrDefault(task.getProjectId(), "Proyecto");
            if (dueSoon) {
                notifications.notifyTaskDueSoon(
                        task.getProjectId(), projectName, userId, task.getTitle(), task.getId());
                task.markDueSoonNotified(notifiedAt);
            } else {
                notifications.notifyTaskOverdue(
                        task.getProjectId(), projectName, userId, task.getTitle(), task.getId());
                task.markOverdueNotified(notifiedAt);
            }
        }
        taskRepository.saveAll(tasks);
    }
}
