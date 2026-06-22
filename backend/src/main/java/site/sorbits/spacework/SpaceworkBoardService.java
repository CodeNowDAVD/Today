package site.sorbits.spacework;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.files.StoredFile;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.life.LifeService;
import site.sorbits.life.TaskTag;
import site.sorbits.life.TaskTagRepository;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.dto.*;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpaceworkBoardService {

    private static final List<String> DEFAULT_COLUMNS = List.of("Por hacer", "En curso", "Hecho");
    private static final List<String> ACADEMIC_COLUMNS = List.of("Por hacer", "En curso", "Entregado");

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectBoardColumnRepository columnRepository;
    private final ProjectTaskRepository taskRepository;
    private final ProjectItemRepository itemRepository;
    private final StoredFileRepository fileRepository;
    private final ProjectActivityRepository activityRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkBoardStreamHub streamHub;
    private final NotificationService notifications;
    private final TaskTagRepository taskTagRepository;

    public SpaceworkBoardService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectBoardColumnRepository columnRepository,
            ProjectTaskRepository taskRepository,
            ProjectItemRepository itemRepository,
            StoredFileRepository fileRepository,
            ProjectActivityRepository activityRepository,
            UserAccountRepository userRepository,
            SpaceworkBoardStreamHub streamHub,
            NotificationService notifications,
            TaskTagRepository taskTagRepository) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.columnRepository = columnRepository;
        this.taskRepository = taskRepository;
        this.itemRepository = itemRepository;
        this.fileRepository = fileRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.streamHub = streamHub;
        this.notifications = notifications;
        this.taskTagRepository = taskTagRepository;
    }

    @Transactional
    public void seedDefaultBoard(long projectId) {
        seedBoardForTemplate(projectId, WorkspaceTemplate.FREE);
    }

    @Transactional
    public void seedBoardForTemplate(long projectId, WorkspaceTemplate template) {
        if (columnRepository.countByProjectId(projectId) > 0) {
            return;
        }
        List<String> columns = template == WorkspaceTemplate.ACADEMIC_COURSE ? ACADEMIC_COLUMNS : DEFAULT_COLUMNS;
        for (int i = 0; i < columns.size(); i++) {
            columnRepository.save(ProjectBoardColumn.create(projectId, columns.get(i), i));
        }
    }

    @Transactional
    public BoardResponse getBoard(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        ensureDefaultBoard(projectId);
        List<BoardColumnResponse> columns = columnRepository.findByProjectIdOrderByPositionAsc(projectId).stream()
                .map(c -> new BoardColumnResponse(c.getId(), c.getName(), c.getPosition()))
                .toList();
        List<BoardTaskResponse> tasks = mapTasks(taskRepository.findByProjectIdOrderByColumnIdAscPositionAsc(projectId));
        return new BoardResponse(columns, tasks);
    }

    @Transactional
    public BoardColumnResponse createColumn(UserAccount user, long projectId, CreateBoardColumnRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (!membership.getRole().canEditProject()) {
            throw new SpaceworkAccessDeniedException("No puedes crear columnas");
        }
        ensureDefaultBoard(projectId);
        int position = (int) columnRepository.countByProjectId(projectId);
        var saved = columnRepository.save(ProjectBoardColumn.create(projectId, req.name(), position));
        return new BoardColumnResponse(saved.getId(), saved.getName(), saved.getPosition());
    }

    @Transactional
    public BoardTaskResponse createTask(UserAccount user, long projectId, CreateBoardTaskRequest req) {
        return createTaskWithDue(
                user, projectId, req.columnId(), req.title(), req.description(), req.assigneeUserId(), req.dueAt(), req.tags());
    }

    @Transactional
    public BoardTaskResponse createTaskWithDue(
            UserAccount user,
            long projectId,
            long columnId,
            String title,
            String description,
            Long assigneeUserId,
            Instant dueAt) {
        return createTaskWithDue(user, projectId, columnId, title, description, assigneeUserId, dueAt, null);
    }

    @Transactional
    public BoardTaskResponse createTaskWithDue(
            UserAccount user,
            long projectId,
            long columnId,
            String title,
            String description,
            Long assigneeUserId,
            Instant dueAt,
            List<String> tags) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes crear tareas");
        }
        ProjectBoardColumn column = requireColumn(projectId, columnId);
        validateAssignee(projectId, assigneeUserId);
        int position = taskRepository.findByColumnIdOrderByPositionAsc(column.getId()).size();
        var saved = taskRepository.save(ProjectTask.create(
                projectId, column.getId(), title, description, position, assigneeUserId, user.getId()));
        if (dueAt != null) {
            saved.setDueAt(dueAt);
            taskRepository.save(saved);
        }
        applyCompletionForColumn(saved, column.getName());
        taskRepository.save(saved);
        replaceTaskTags(saved.getId(), tags);
        BoardTaskResponse response = toTaskResponse(saved);
        streamHub.broadcastTask(projectId, response);
        logActivity(projectId, user.getId(), "TASK_CREATED", "Creó la tarea «" + saved.getTitle() + "»");
        notifyAssigneeIfNeeded(user, projectId, saved, null);
        return response;
    }

    @Transactional
    public BoardTaskResponse completeTask(UserAccount user, long projectId, long taskId) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura");
        }
        ProjectTask task = requireTask(projectId, taskId);
        ProjectBoardColumn doneColumn = columnRepository.findByProjectIdOrderByPositionAsc(projectId).stream()
                .filter(c -> LifeService.isDoneColumn(c.getName()))
                .findFirst()
                .orElseGet(() -> {
                    var cols = columnRepository.findByProjectIdOrderByPositionAsc(projectId);
                    return cols.get(cols.size() - 1);
                });
        UpdateBoardTaskRequest req = new UpdateBoardTaskRequest(
                null, null, doneColumn.getId(), null, null, null, null, null, null, null, true, null, null);
        return updateTask(user, projectId, taskId, req);
    }

    @Transactional
    public BoardTaskResponse updateTask(UserAccount user, long projectId, long taskId, UpdateBoardTaskRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes editar tareas");
        }
        ProjectTask task = requireTask(projectId, taskId);
        Long oldColumnId = task.getColumnId();
        Long previousAssignee = task.getAssigneeUserId();

        if (req.title() != null) {
            if (req.title().isBlank()) {
                throw new IllegalArgumentException("Título vacío");
            }
            task.setTitle(req.title());
        }
        if (req.description() != null) {
            task.setDescription(req.description());
        }
        if (Boolean.TRUE.equals(req.clearAssignee())) {
            task.setAssigneeUserId(null);
        } else if (req.assigneeUserId() != null) {
            validateAssignee(projectId, req.assigneeUserId());
            task.setAssigneeUserId(req.assigneeUserId());
        }
        if (Boolean.TRUE.equals(req.clearLinkedFile())) {
            task.setLinkedFileId(null);
        } else if (req.linkedFileId() != null) {
            validateLinkedFile(projectId, req.linkedFileId());
            task.setLinkedFileId(req.linkedFileId());
        }
        if (Boolean.TRUE.equals(req.clearDueAt())) {
            task.setDueAt(null);
        } else if (req.dueAt() != null) {
            task.setDueAt(req.dueAt());
        }
        if (Boolean.TRUE.equals(req.complete())) {
            task.markCompleted();
        } else if (Boolean.TRUE.equals(req.reopen())) {
            task.markIncomplete();
        }

        boolean columnChanged = req.columnId() != null && !req.columnId().equals(task.getColumnId());
        ProjectBoardColumn targetColumn = null;
        if (columnChanged) {
            targetColumn = requireColumn(projectId, req.columnId());
            task.setColumnId(req.columnId());
        }

        if (targetColumn != null) {
            applyCompletionForColumn(task, targetColumn.getName());
        }

        taskRepository.save(task);

        if (columnChanged) {
            normalizeColumnPositions(oldColumnId);
        }

        if (req.position() != null || columnChanged) {
            int targetPos = req.position() != null ? req.position() : Integer.MAX_VALUE;
            reorderTask(task, targetPos);
        }

        if (req.tags() != null) {
            replaceTaskTags(taskId, req.tags());
        }

        task = taskRepository.findById(taskId).orElseThrow();
        BoardTaskResponse response = toTaskResponse(task);
        streamHub.broadcastTask(projectId, response);
        notifyAssigneeIfNeeded(user, projectId, task, previousAssignee);
        return response;
    }

    @Transactional
    public void deleteTask(UserAccount user, long projectId, long taskId) {
        ProjectMember membership = requireMembership(user, projectId);
        ProjectTask task = requireTask(projectId, taskId);
        boolean canDelete = membership.getRole().canEditProject()
                || user.getId().equals(task.getCreatedBy());
        if (!canDelete) {
            throw new SpaceworkAccessDeniedException("No puedes borrar esta tarea");
        }
        long columnId = task.getColumnId();
        taskTagRepository.deleteByTaskId(taskId);
        taskRepository.delete(task);
        normalizeColumnPositions(columnId);
        streamHub.broadcastDeleted(projectId, taskId);
        logActivity(projectId, user.getId(), "TASK_DELETED", "Eliminó una tarea");
    }

    public SseEmitter subscribeStream(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        return streamHub.subscribe(projectId);
    }

    private void applyCompletionForColumn(ProjectTask task, String columnName) {
        if (LifeService.isDoneColumn(columnName)) {
            if (!task.isCompleted()) {
                task.markCompleted();
            }
        } else if (task.isCompleted() && !LifeService.isDoneColumn(columnName)) {
            task.markIncomplete();
        }
    }

    private void notifyAssigneeIfNeeded(UserAccount user, long projectId, ProjectTask task, Long previousAssignee) {
        if (task.getAssigneeUserId() != null && !task.getAssigneeUserId().equals(previousAssignee)) {
            Project project = requireProject(projectId);
            notifications.notifyTaskAssigned(
                    user, projectId, project.getName(), task.getAssigneeUserId(), task.getTitle(), task.getId());
        }
    }

    private void replaceTaskTags(long taskId, List<String> tags) {
        if (tags == null) {
            return;
        }
        taskTagRepository.deleteByTaskId(taskId);
        Set<String> seen = new HashSet<>();
        for (String tag : tags) {
            if (tag == null || tag.isBlank()) continue;
            String normalized = tag.trim().toLowerCase();
            if (normalized.length() > 100 || !seen.add(normalized)) continue;
            taskTagRepository.save(TaskTag.of(taskId, normalized));
        }
    }

    private void ensureDefaultBoard(long projectId) {
        seedDefaultBoard(projectId);
    }

    private void reorderTask(ProjectTask task, int targetPosition) {
        List<ProjectTask> inColumn = new ArrayList<>(taskRepository.findByColumnIdOrderByPositionAsc(task.getColumnId()));
        inColumn.removeIf(t -> t.getId().equals(task.getId()));
        int insertAt = Math.min(targetPosition, inColumn.size());
        inColumn.add(insertAt, task);
        for (int i = 0; i < inColumn.size(); i++) {
            inColumn.get(i).setPosition(i);
        }
        taskRepository.saveAll(inColumn);
    }

    private void normalizeColumnPositions(long columnId) {
        List<ProjectTask> tasks = taskRepository.findByColumnIdOrderByPositionAsc(columnId);
        for (int i = 0; i < tasks.size(); i++) {
            tasks.get(i).setPosition(i);
        }
        taskRepository.saveAll(tasks);
    }

    private void validateAssignee(long projectId, Long assigneeUserId) {
        if (assigneeUserId == null) {
            return;
        }
        if (!memberRepository.findByProjectIdAndUserId(projectId, assigneeUserId).isPresent()) {
            throw new IllegalArgumentException("El responsable debe ser miembro del proyecto");
        }
    }

    private void validateLinkedFile(long projectId, long fileId) {
        if (!itemRepository.findByProjectIdAndFileId(projectId, fileId).isPresent()) {
            throw new IllegalArgumentException("El archivo debe estar visible en el proyecto");
        }
    }

    private ProjectBoardColumn requireColumn(long projectId, long columnId) {
        return columnRepository
                .findById(columnId)
                .filter(c -> c.getProjectId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Columna no encontrada"));
    }

    private ProjectTask requireTask(long projectId, long taskId) {
        return taskRepository
                .findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
    }

    private List<BoardTaskResponse> mapTasks(List<ProjectTask> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = new HashSet<>();
        Set<Long> fileIds = new HashSet<>();
        for (ProjectTask t : rows) {
            userIds.add(t.getCreatedBy());
            if (t.getAssigneeUserId() != null) {
                userIds.add(t.getAssigneeUserId());
            }
            if (t.getLinkedFileId() != null) {
                fileIds.add(t.getLinkedFileId());
            }
        }
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        Map<Long, String> fileNames = fileIds.isEmpty()
                ? Map.of()
                : fileRepository.findAllById(fileIds).stream()
                        .collect(Collectors.toMap(StoredFile::getId, StoredFile::getOriginalName));
        Map<Long, List<String>> tagsByTask = taskTagRepository
                .findByTaskIdIn(rows.stream().map(ProjectTask::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        TaskTag::getTaskId, Collectors.mapping(TaskTag::getTag, Collectors.toList())));
        return rows.stream()
                .map(t -> toTaskResponse(t, names, fileNames, tagsByTask.getOrDefault(t.getId(), List.of())))
                .toList();
    }

    private BoardTaskResponse toTaskResponse(ProjectTask t) {
        List<String> tags = taskTagRepository.findByTaskId(t.getId()).stream().map(TaskTag::getTag).toList();
        Set<Long> userIds = new HashSet<>();
        userIds.add(t.getCreatedBy());
        if (t.getAssigneeUserId() != null) {
            userIds.add(t.getAssigneeUserId());
        }
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        Map<Long, String> fileNames = Map.of();
        if (t.getLinkedFileId() != null) {
            fileNames = fileRepository
                    .findById(t.getLinkedFileId())
                    .map(f -> Map.of(f.getId(), f.getOriginalName()))
                    .orElse(Map.of());
        }
        return toTaskResponse(t, names, fileNames, tags);
    }

    private static BoardTaskResponse toTaskResponse(
            ProjectTask t, Map<Long, String> names, Map<Long, String> fileNames, List<String> tags) {
        Long assigneeId = t.getAssigneeUserId();
        Long linkedFileId = t.getLinkedFileId();
        return new BoardTaskResponse(
                t.getId(),
                t.getColumnId(),
                t.getTitle(),
                t.getDescription(),
                t.getPosition(),
                assigneeId,
                assigneeId == null ? null : names.getOrDefault(assigneeId, "?"),
                linkedFileId,
                linkedFileId == null ? null : fileNames.getOrDefault(linkedFileId, "Archivo"),
                names.getOrDefault(t.getCreatedBy(), "?"),
                t.getCreatedAt(),
                t.getUpdatedAt(),
                t.getDueAt(),
                t.getCompletedAt(),
                tags);
    }

    private Project requireProject(long projectId) {
        return projectRepository
                .findById(projectId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
    }

    private ProjectMember requireMembership(UserAccount user, long projectId) {
        Project project = requireProject(projectId);
        if (project.isPersonal() && !project.getCreatedBy().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new SpaceworkAccessDeniedException("Espacio personal no accesible");
        }
        if (user.getRole() == Role.ADMIN) {
            return memberRepository
                    .findByProjectIdAndUserId(projectId, user.getId())
                    .orElseGet(() -> ProjectMember.create(projectId, user.getId(), ProjectRole.ADMIN));
        }
        return memberRepository
                .findByProjectIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new SpaceworkAccessDeniedException("No eres miembro de este proyecto"));
    }

    private void logActivity(long projectId, long actorUserId, String type, String summary) {
        activityRepository.save(ProjectActivity.of(projectId, actorUserId, type, summary, "TASK", null));
    }
}
