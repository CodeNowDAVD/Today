package site.sorbits.notification;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.notification.dto.NotificationResponse;
import site.sorbits.notification.dto.UnreadCountResponse;
import site.sorbits.spacework.Project;
import site.sorbits.spacework.ProjectMemberRepository;
import site.sorbits.spacework.ProjectRepository;
import site.sorbits.user.UserAccount;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private static final int PAGE_SIZE = 40;

    private final UserNotificationRepository notificationRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository projectRepository;
    private final NotificationStreamHub streamHub;

    public NotificationService(
            UserNotificationRepository notificationRepository,
            ProjectMemberRepository memberRepository,
            ProjectRepository projectRepository,
            NotificationStreamHub streamHub) {
        this.notificationRepository = notificationRepository;
        this.memberRepository = memberRepository;
        this.projectRepository = projectRepository;
        this.streamHub = streamHub;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(UserAccount user) {
        return mapRows(notificationRepository.findByUserIdOrderByCreatedAtDesc(
                user.getId(), PageRequest.of(0, PAGE_SIZE)));
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(UserAccount user) {
        return new UnreadCountResponse(notificationRepository.countByUserIdAndReadAtIsNull(user.getId()));
    }

    @Transactional
    public NotificationResponse markRead(UserAccount user, long id) {
        UserNotification n = notificationRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Notificación no encontrada"));
        n.markRead();
        notificationRepository.save(n);
        return toResponse(n, projectName(n.getProjectId()));
    }

    @Transactional
    public UnreadCountResponse markAllRead(UserAccount user) {
        notificationRepository.markAllRead(user.getId(), Instant.now());
        return new UnreadCountResponse(0);
    }

    @Transactional
    public void notifyTaskAssigned(
            UserAccount actor, long projectId, String projectName, long assigneeUserId, String taskTitle, long taskId) {
        if (assigneeUserId == actor.getId()) {
            return;
        }
        deliver(
                assigneeUserId,
                projectId,
                "TASK_ASSIGNED",
                "Tarea asignada",
                actor.getUsername() + " te asignó «" + taskTitle + "» en " + projectName,
                "tasks",
                taskId);
    }

    @Transactional
    public void notifyMemberAdded(
            UserAccount actor, long projectId, String projectName, long inviteeUserId) {
        if (inviteeUserId == actor.getId()) {
            return;
        }
        deliver(
                inviteeUserId,
                projectId,
                "MEMBER_ADDED",
                "Nuevo proyecto",
                actor.getUsername() + " te añadió a «" + projectName + "»",
                "items",
                null);
    }

    @Transactional
    public void notifyFileComment(
            UserAccount actor,
            long projectId,
            String projectName,
            long fileId,
            String fileName,
            String snippet) {
        String body = actor.getUsername() + " comentó en «" + fileName + "»: " + truncate(snippet, 120);
        notifyMembersExcept(actor.getId(), projectId, "FILE_COMMENT", "Comentario en archivo", body, "items", fileId);
    }

    @Transactional
    public void notifyChatMessage(
            UserAccount actor,
            long projectId,
            String projectName,
            String channelName,
            String snippet) {
        String body = actor.getUsername() + " en #" + channelName + ": " + truncate(snippet, 120);
        notifyMembersExcept(actor.getId(), projectId, "CHAT_MESSAGE", projectName, body, "chat", null);
    }

    @Transactional
    public void notifyTaskDueSoon(
            long projectId, String projectName, long userId, String taskTitle, long taskId) {
        deliver(
                userId,
                projectId,
                "TASK_DUE_SOON",
                "Vence pronto",
                "«" + taskTitle + "» en " + projectName + " vence en las próximas 24 h",
                "life",
                taskId);
    }

    @Transactional
    public void notifyTaskOverdue(
            long projectId, String projectName, long userId, String taskTitle, long taskId) {
        deliver(
                userId,
                projectId,
                "TASK_OVERDUE",
                "Tarea vencida",
                "«" + taskTitle + "» en " + projectName + " ya pasó su fecha límite",
                "life",
                taskId);
    }

    @Transactional
    public void notifyProjectInvitation(
            UserAccount actor,
            long projectId,
            String projectName,
            long inviteeUserId,
            String role,
            long invitationId) {
        deliver(
                inviteeUserId,
                projectId,
                "PROJECT_INVITATION",
                "Invitación a proyecto",
                actor.getUsername() + " te invitó a «" + projectName + "» como " + role,
                "members",
                invitationId);
    }

    private void notifyMembersExcept(
            long excludeUserId,
            long projectId,
            String kind,
            String title,
            String body,
            String targetTab,
            Long entityId) {
        memberRepository.findByProjectIdOrderByJoinedAtAsc(projectId).stream()
                .map(m -> m.getUserId())
                .filter(userId -> userId != excludeUserId)
                .forEach(userId -> deliver(userId, projectId, kind, title, body, targetTab, entityId));
    }

    private void deliver(
            long userId,
            long projectId,
            String kind,
            String title,
            String body,
            String targetTab,
            Long entityId) {
        UserNotification saved = notificationRepository.save(UserNotification.create(
                userId, projectId, kind, title, body, targetTab, entityId));
        long unread = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        streamHub.broadcast(userId, toResponse(saved, projectName(projectId)), unread);
    }

    private List<NotificationResponse> mapRows(List<UserNotification> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Long, String> names = projectRepository
                .findAllById(rows.stream().map(UserNotification::getProjectId).collect(Collectors.toSet()))
                .stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));
        return rows.stream().map(n -> toResponse(n, names.getOrDefault(n.getProjectId(), "Proyecto"))).toList();
    }

    private String projectName(long projectId) {
        return projectRepository.findById(projectId).map(Project::getName).orElse("Proyecto");
    }

    private static NotificationResponse toResponse(UserNotification n, String projectName) {
        return new NotificationResponse(
                n.getId(),
                n.getKind(),
                n.getTitle(),
                n.getBody(),
                n.getProjectId(),
                projectName,
                n.getTargetTab(),
                n.getEntityId(),
                n.isRead(),
                n.getCreatedAt());
    }

    private static String truncate(String text, int max) {
        if (text == null) {
            return "";
        }
        String t = text.trim();
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }
}
