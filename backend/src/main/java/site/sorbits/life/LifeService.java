package site.sorbits.life;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.files.FileSection;
import site.sorbits.files.StoredFile;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.life.dto.LifeDtos.*;
import site.sorbits.spacework.*;
import site.sorbits.spacework.dto.BoardTaskResponse;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LifeService {

    private static final Set<String> DONE_COLUMNS = Set.of("hecho", "entregado", "done");

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectItemRepository itemRepository;
    private final ProjectTaskRepository taskRepository;
    private final ProjectBoardColumnRepository columnRepository;
    private final StoredFileRepository fileRepository;
    private final UserAccountRepository userRepository;
    private final InboxItemRepository inboxRepository;
    private final ContactRepository contactRepository;
    private final TaskTagRepository taskTagRepository;
    private final TaskContactRepository taskContactRepository;
    private final FileContactRepository fileContactRepository;
    private final SpaceworkBoardService boardService;
    private final SpaceworkWikiService wikiService;
    private final ProjectChannelRepository channelRepository;
    private final ProjectActivityRepository activityRepository;
    private final ZoneId zoneId;

    public LifeService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectItemRepository itemRepository,
            ProjectTaskRepository taskRepository,
            ProjectBoardColumnRepository columnRepository,
            StoredFileRepository fileRepository,
            UserAccountRepository userRepository,
            InboxItemRepository inboxRepository,
            ContactRepository contactRepository,
            TaskTagRepository taskTagRepository,
            TaskContactRepository taskContactRepository,
            FileContactRepository fileContactRepository,
            SpaceworkBoardService boardService,
            SpaceworkWikiService wikiService,
            ProjectChannelRepository channelRepository,
            ProjectActivityRepository activityRepository,
            @org.springframework.beans.factory.annotation.Value("${app.timezone:America/Mexico_City}")
                    String timezone) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.itemRepository = itemRepository;
        this.taskRepository = taskRepository;
        this.columnRepository = columnRepository;
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
        this.inboxRepository = inboxRepository;
        this.contactRepository = contactRepository;
        this.taskTagRepository = taskTagRepository;
        this.taskContactRepository = taskContactRepository;
        this.fileContactRepository = fileContactRepository;
        this.boardService = boardService;
        this.wikiService = wikiService;
        this.channelRepository = channelRepository;
        this.activityRepository = activityRepository;
        this.zoneId = ZoneId.of(timezone);
    }

    @Transactional(readOnly = true)
    public List<LifeWorkspaceResponse> listPersonalWorkspaces(UserAccount user) {
        return projectRepository.findActivePersonalForOwner(user.getId()).stream()
                .map(p -> toWorkspaceResponse(p, user.getUsername()))
                .toList();
    }

    @Transactional
    public LifeWorkspaceResponse createPersonalWorkspace(UserAccount user, CreateLifeWorkspaceRequest req) {
        WorkspaceTemplate template = parseTemplate(req.template());
        Project project = projectRepository.save(Project.create(
                user.getId(), req.name(), req.description(), WorkspaceKind.PERSONAL, template));
        memberRepository.save(ProjectMember.create(project.getId(), user.getId(), ProjectRole.OWNER));
        channelRepository.save(ProjectChannel.create(project.getId(), "general", "Notas", true));
        boardService.seedBoardForTemplate(project.getId(), template);
        wikiService.seedDefaultPage(project.getId(), user.getId());
        activityRepository.save(ProjectActivity.of(
                project.getId(),
                user.getId(),
                "PROJECT_CREATED",
                "Creó el espacio personal «" + project.getName() + "»",
                "PROJECT",
                project.getId()));
        return toWorkspaceResponse(project, user.getUsername());
    }

    @Transactional
    public void archivePersonalWorkspace(UserAccount user, long workspaceId) {
        Project project = requirePersonalWorkspace(user, workspaceId);
        project.archive();
        projectRepository.save(project);
    }

    @Transactional
    public PromoteWorkspaceResponse promoteToTeam(UserAccount user, long workspaceId) {
        Project project = requirePersonalWorkspace(user, workspaceId);
        if (!project.getCreatedBy().equals(user.getId())) {
            throw new SpaceworkAccessDeniedException("Solo el dueño puede compartir este espacio");
        }
        project.promoteToTeam();
        projectRepository.save(project);
        return new PromoteWorkspaceResponse(project.getId(), WorkspaceKind.TEAM.name());
    }

    @Transactional(readOnly = true)
    public TodayResponse getToday(UserAccount user) {
        LifeDayBounds bounds = LifeDayBounds.at(zoneId, Instant.now());
        Instant now = bounds.now();
        Instant startOfTomorrow = bounds.startOfTomorrow();

        List<LifeTaskSummary> overdue = mapTaskSummaries(
                taskRepository.findOpenTasksDueBetween(user.getId(), null, now),
                bounds);
        List<LifeTaskSummary> dueToday = mapTaskSummaries(
                taskRepository.findOpenTasksDueBetween(user.getId(), now, startOfTomorrow),
                bounds);
        List<LifeTaskSummary> dueSoon = mapTaskSummaries(
                taskRepository.findDueSoonForMember(
                        user.getId(), startOfTomorrow, bounds.endOfSoonWindow()),
                bounds);

        List<InboxItemResponse> inbox = inboxRepository.findByUserIdAndProcessedFalseOrderByCreatedAtDesc(user.getId())
                .stream()
                .limit(10)
                .map(InboxItemResponse::from)
                .toList();

        List<RecentFileResponse> recentFiles = fileRepository
                .findByOwnerIdAndSectionAndDeletedAtIsNullOrderByCreatedAtDesc(
                        user.getId(), FileSection.UTILS)
                .stream()
                .limit(5)
                .map(f -> new RecentFileResponse(
                        f.getId(), f.getOriginalName(), f.getContentType(), f.getCreatedAt()))
                .toList();

        List<LifeWorkspaceResponse> activeWorkspaces = listPersonalWorkspaces(user);

        TodayMeta meta = new TodayMeta(
                zoneId.getId(),
                bounds.now(),
                bounds.startOfToday(),
                bounds.startOfTomorrow(),
                LifeDayBounds.SOON_DAYS,
                LifeDayBounds.UPCOMING_DAYS);

        return new TodayResponse(
                meta,
                overdue,
                dueToday,
                dueSoon,
                inbox,
                recentFiles,
                activeWorkspaces,
                inboxRepository.countByUserIdAndProcessedFalse(user.getId()));
    }

    @Transactional(readOnly = true)
    public List<LifeTaskSummary> listTasks(
            UserAccount user, String filter, String tag, Long workspaceId) {
        List<ProjectTask> tasks = taskRepository.findOpenTasksForMember(user.getId(), PageRequest.of(0, 200));
        List<LifeTaskSummary> summaries = mapTaskSummaries(tasks, LifeDayBounds.at(zoneId, Instant.now()));

        if (workspaceId != null) {
            summaries = summaries.stream().filter(t -> t.workspaceId() == workspaceId).toList();
        }
        if (tag != null && !tag.isBlank()) {
            String normalized = tag.trim().toLowerCase();
            summaries = summaries.stream()
                    .filter(t -> t.tags().contains(normalized))
                    .toList();
        }

        LifeDayBounds bounds = LifeDayBounds.at(zoneId, Instant.now());

        return switch (filter == null ? "all" : filter) {
            case "today" -> summaries.stream()
                    .filter(t -> bounds.isDueToday(t.dueAt()))
                    .map(t -> withBucket(t, LifeDueBucket.TODAY))
                    .toList();
            case "overdue" -> summaries.stream()
                    .filter(t -> bounds.isOverdue(t.dueAt()))
                    .map(t -> withBucket(t, LifeDueBucket.OVERDUE))
                    .toList();
            case "upcoming" -> summaries.stream()
                    .filter(t -> t.dueAt() != null && bounds.isUpcoming(t.dueAt()))
                    .map(t -> withBucket(t, bounds.bucket(t.dueAt())))
                    .toList();
            default -> summaries.stream()
                    .map(t -> t.dueAt() == null
                            ? withBucket(t, LifeDueBucket.NONE)
                            : withBucket(t, bounds.bucket(t.dueAt())))
                    .toList();
        };
    }

    private static LifeTaskSummary withBucket(LifeTaskSummary task, LifeDueBucket bucket) {
        return new LifeTaskSummary(
                task.id(),
                task.workspaceId(),
                task.workspaceName(),
                task.workspaceKind(),
                task.columnId(),
                task.columnName(),
                task.title(),
                task.description(),
                task.dueAt(),
                task.completedAt(),
                task.linkedFileId(),
                task.linkedFileName(),
                task.tags(),
                bucket.name());
    }

    @Transactional
    public BoardTaskResponse completeTask(UserAccount user, long workspaceId, long taskId) {
        return boardService.completeTask(user, workspaceId, taskId);
    }

    @Transactional(readOnly = true)
    public List<InboxItemResponse> listInbox(UserAccount user) {
        return inboxRepository.findByUserIdAndProcessedFalseOrderByCreatedAtDesc(user.getId()).stream()
                .map(InboxItemResponse::from)
                .toList();
    }

    @Transactional
    public InboxItemResponse capture(UserAccount user, CreateInboxRequest req) {
        InboxItem.Kind kind = parseInboxKind(req.content(), req.kind());
        InboxItem saved = inboxRepository.save(InboxItem.create(user.getId(), req.content(), kind));
        return InboxItemResponse.from(saved);
    }

    @Transactional
    public InboxItemResponse patchInbox(UserAccount user, long id, PatchInboxRequest req) {
        InboxItem item = inboxRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Item no encontrado"));

        if (Boolean.TRUE.equals(req.processed()) || req.convertToTaskTitle() != null) {
            Long taskId = null;
            Long workspaceId = req.workspaceId();
            if (req.convertToTaskTitle() != null && !req.convertToTaskTitle().isBlank()) {
                if (workspaceId == null) {
                    throw new IllegalArgumentException("workspaceId requerido para convertir en tarea");
                }
                requirePersonalOrMember(user, workspaceId);
                var board = boardService.getBoard(user, workspaceId);
                long columnId = req.convertToTaskColumnId() != null
                        ? req.convertToTaskColumnId()
                        : board.columns().get(0).id();
                var created = boardService.createTaskWithDue(
                        user,
                        workspaceId,
                        columnId,
                        req.convertToTaskTitle().trim(),
                        item.getContent(),
                        null,
                        req.convertToTaskDueAt());
                taskId = created.id();
            } else if (Boolean.TRUE.equals(req.processed())) {
                if (workspaceId != null) {
                    requirePersonalOrMember(user, workspaceId);
                }
            }
            item.markProcessed(workspaceId, taskId);
            inboxRepository.save(item);
        }

        return InboxItemResponse.from(item);
    }

    @Transactional
    public void deleteInbox(UserAccount user, long id) {
        InboxItem item = inboxRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Item no encontrado"));
        inboxRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public long inboxPendingCount(UserAccount user) {
        return inboxRepository.countByUserIdAndProcessedFalse(user.getId());
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> listContacts(UserAccount user) {
        return contactRepository.findByUserIdOrderByNameAsc(user.getId()).stream()
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional
    public ContactResponse createContact(UserAccount user, CreateContactRequest req) {
        Contact saved = contactRepository.save(Contact.create(
                user.getId(), req.name(), req.roleLabel(), req.email(), req.notes()));
        return toContactResponse(saved);
    }

    @Transactional
    public ContactResponse updateContact(UserAccount user, long id, UpdateContactRequest req) {
        Contact contact = requireContact(user, id);
        if (req.name() != null) {
            if (req.name().isBlank()) {
                throw new IllegalArgumentException("Nombre vacío");
            }
            contact.update(req.name(), req.roleLabel(), req.email(), req.notes());
        } else {
            contact.update(contact.getName(), req.roleLabel(), req.email(), req.notes());
        }
        return toContactResponse(contactRepository.save(contact));
    }

    @Transactional
    public void deleteContact(UserAccount user, long id) {
        Contact contact = requireContact(user, id);
        contactRepository.delete(contact);
    }

    @Transactional(readOnly = true)
    public ContactLinkedResponse getContactLinked(UserAccount user, long id) {
        Contact contact = requireContact(user, id);
        List<Long> taskIds = taskContactRepository.findByContactId(id).stream()
                .map(TaskContact::getTaskId)
                .toList();
        List<LifeTaskSummary> tasks = taskIds.isEmpty()
                ? List.of()
                : mapTaskSummaries(taskRepository.findAllById(taskIds));

        List<Long> fileIds = fileContactRepository.findByContactId(id).stream()
                .map(FileContact::getFileId)
                .toList();
        List<RecentFileResponse> files = fileIds.isEmpty()
                ? List.of()
                : fileRepository.findAllById(fileIds).stream()
                        .filter(f -> f.getOwnerId().equals(user.getId()))
                        .map(f -> new RecentFileResponse(
                                f.getId(), f.getOriginalName(), f.getContentType(), f.getCreatedAt()))
                        .toList();

        return new ContactLinkedResponse(toContactResponse(contact), tasks, files);
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> listTaskContacts(UserAccount user, long taskId) {
        ProjectTask task = taskRepository
                .findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        requirePersonalOrMember(user, task.getProjectId());
        List<Long> contactIds = taskContactRepository.findByTaskId(taskId).stream()
                .map(TaskContact::getContactId)
                .toList();
        if (contactIds.isEmpty()) {
            return List.of();
        }
        return contactRepository.findAllById(contactIds).stream()
                .filter(c -> c.getUserId().equals(user.getId()))
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional
    public List<ContactResponse> setTaskContacts(UserAccount user, long taskId, List<Long> contactIds) {
        ProjectTask task = taskRepository
                .findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        requirePersonalOrMember(user, task.getProjectId());
        Set<Long> desired = contactIds == null
                ? Set.of()
                : contactIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        for (Long contactId : desired) {
            requireContact(user, contactId);
        }
        Set<Long> current = taskContactRepository.findByTaskId(taskId).stream()
                .map(TaskContact::getContactId)
                .collect(Collectors.toSet());
        for (Long id : current) {
            if (!desired.contains(id)) {
                taskContactRepository.deleteByTaskIdAndContactId(taskId, id);
            }
        }
        for (Long id : desired) {
            if (!current.contains(id)) {
                taskContactRepository.save(TaskContact.of(taskId, id));
            }
        }
        return listTaskContacts(user, taskId);
    }

    @Transactional
    public void linkContactToTask(UserAccount user, long contactId, long taskId) {
        Contact contact = requireContact(user, contactId);
        ProjectTask task = taskRepository
                .findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        requirePersonalOrMember(user, task.getProjectId());
        if (!taskContactRepository.existsByTaskIdAndContactId(taskId, contact.getId())) {
            taskContactRepository.save(TaskContact.of(taskId, contact.getId()));
        }
    }

    @Transactional
    public void unlinkContactFromTask(UserAccount user, long contactId, long taskId) {
        requireContact(user, contactId);
        ProjectTask task = taskRepository
                .findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Tarea no encontrada"));
        requirePersonalOrMember(user, task.getProjectId());
        taskContactRepository.deleteByTaskIdAndContactId(taskId, contactId);
    }

    @Transactional
    public void linkContactToFile(UserAccount user, long contactId, long fileId) {
        Contact contact = requireContact(user, contactId);
        StoredFile file = requireOwnedFile(user, fileId);
        if (!fileContactRepository.existsByFileIdAndContactId(file.getId(), contact.getId())) {
            fileContactRepository.save(FileContact.of(file.getId(), contact.getId()));
        }
    }

    @Transactional(readOnly = true)
    public List<ContactResponse> listFileContacts(UserAccount user, long fileId) {
        requireOwnedFile(user, fileId);
        List<Long> contactIds = fileContactRepository.findByFileId(fileId).stream()
                .map(FileContact::getContactId)
                .toList();
        if (contactIds.isEmpty()) {
            return List.of();
        }
        return contactRepository.findAllById(contactIds).stream()
                .filter(c -> c.getUserId().equals(user.getId()))
                .map(this::toContactResponse)
                .toList();
    }

    @Transactional
    public List<ContactResponse> setFileContacts(UserAccount user, long fileId, List<Long> contactIds) {
        requireOwnedFile(user, fileId);
        Set<Long> desired = contactIds == null
                ? Set.of()
                : contactIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        for (Long contactId : desired) {
            requireContact(user, contactId);
        }
        Set<Long> current = fileContactRepository.findByFileId(fileId).stream()
                .map(FileContact::getContactId)
                .collect(Collectors.toSet());
        for (Long id : current) {
            if (!desired.contains(id)) {
                fileContactRepository.deleteByFileIdAndContactId(fileId, id);
            }
        }
        for (Long id : desired) {
            if (!current.contains(id)) {
                fileContactRepository.save(FileContact.of(fileId, id));
            }
        }
        return listFileContacts(user, fileId);
    }

    @Transactional
    public void unlinkContactFromFile(UserAccount user, long contactId, long fileId) {
        requireContact(user, contactId);
        requireOwnedFile(user, fileId);
        fileContactRepository.deleteByFileIdAndContactId(fileId, contactId);
    }

    @Transactional(readOnly = true)
    public List<String> suggestTags(UserAccount user, String prefix) {
        String p = prefix == null || prefix.isBlank() ? "" : prefix.trim().toLowerCase();
        return taskTagRepository.suggestTags(user.getId(), p + "%");
    }

    @Transactional
    public void replaceTaskTags(long taskId, List<String> tags) {
        taskTagRepository.deleteByTaskId(taskId);
        if (tags == null || tags.isEmpty()) {
            return;
        }
        Set<String> seen = new HashSet<>();
        for (String tag : tags) {
            if (tag == null || tag.isBlank()) continue;
            String normalized = tag.trim().toLowerCase();
            if (normalized.length() > 100 || !seen.add(normalized)) continue;
            taskTagRepository.save(TaskTag.of(taskId, normalized));
        }
    }

    @Transactional(readOnly = true)
    public List<String> getTaskTags(long taskId) {
        return taskTagRepository.findByTaskId(taskId).stream().map(TaskTag::getTag).toList();
    }

    private List<LifeTaskSummary> mapTaskSummaries(List<ProjectTask> tasks) {
        return mapTaskSummaries(tasks, null);
    }

    private List<LifeTaskSummary> mapTaskSummaries(List<ProjectTask> tasks, LifeDayBounds bounds) {
        if (tasks.isEmpty()) {
            return List.of();
        }
        Set<Long> projectIds = tasks.stream().map(ProjectTask::getProjectId).collect(Collectors.toSet());
        Map<Long, Project> projects = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, p -> p));
        Set<Long> columnIds = tasks.stream().map(ProjectTask::getColumnId).collect(Collectors.toSet());
        Map<Long, String> columnNames = columnRepository.findAllById(columnIds).stream()
                .collect(Collectors.toMap(ProjectBoardColumn::getId, ProjectBoardColumn::getName));
        Set<Long> fileIds = tasks.stream()
                .map(ProjectTask::getLinkedFileId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> fileNames = fileIds.isEmpty()
                ? Map.of()
                : fileRepository.findAllById(fileIds).stream()
                        .collect(Collectors.toMap(StoredFile::getId, StoredFile::getOriginalName));
        List<Long> taskIds = tasks.stream().map(ProjectTask::getId).toList();
        Map<Long, List<String>> tagsByTask = taskTagRepository.findByTaskIdIn(taskIds).stream()
                .collect(Collectors.groupingBy(
                        TaskTag::getTaskId, Collectors.mapping(TaskTag::getTag, Collectors.toList())));

        return tasks.stream()
                .map(t -> {
                    Project p = projects.get(t.getProjectId());
                    Long linkedId = t.getLinkedFileId();
                    LifeDueBucket bucket = bounds == null || t.getDueAt() == null
                            ? LifeDueBucket.NONE
                            : bounds.bucket(t.getDueAt());
                    return new LifeTaskSummary(
                            t.getId(),
                            t.getProjectId(),
                            p != null ? p.getName() : "?",
                            p != null ? p.getWorkspaceKind().name() : "TEAM",
                            t.getColumnId(),
                            columnNames.getOrDefault(t.getColumnId(), "—"),
                            t.getTitle(),
                            t.getDescription(),
                            t.getDueAt(),
                            t.getCompletedAt(),
                            linkedId,
                            linkedId == null ? null : fileNames.getOrDefault(linkedId, "Archivo"),
                            tagsByTask.getOrDefault(t.getId(), List.of()),
                            bucket.name());
                })
                .toList();
    }

    private LifeWorkspaceResponse toWorkspaceResponse(Project p, String creatorUsername) {
        return new LifeWorkspaceResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getWorkspaceKind().name(),
                p.getTemplate() == null ? null : p.getTemplate().name(),
                creatorUsername,
                p.getCreatedAt(),
                (int) itemRepository.countByProjectId(p.getId()));
    }

    private ContactResponse toContactResponse(Contact c) {
        return new ContactResponse(c.getId(), c.getName(), c.getRoleLabel(), c.getEmail(), c.getNotes(), c.getCreatedAt());
    }

    private Project requirePersonalWorkspace(UserAccount user, long workspaceId) {
        Project project = projectRepository
                .findById(workspaceId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Espacio no encontrado"));
        if (!project.isPersonal() || !project.getCreatedBy().equals(user.getId())) {
            throw new SpaceworkAccessDeniedException("Espacio personal no accesible");
        }
        return project;
    }

    private void requirePersonalOrMember(UserAccount user, long workspaceId) {
        Project project = projectRepository
                .findById(workspaceId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Espacio no encontrado"));
        if (project.isPersonal() && !project.getCreatedBy().equals(user.getId())) {
            throw new SpaceworkAccessDeniedException("Espacio personal no accesible");
        }
        memberRepository
                .findByProjectIdAndUserId(workspaceId, user.getId())
                .orElseThrow(() -> new SpaceworkAccessDeniedException("No eres miembro"));
    }

    private Contact requireContact(UserAccount user, long id) {
        return contactRepository
                .findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Contacto no encontrado"));
    }

    private StoredFile requireOwnedFile(UserAccount user, long fileId) {
        return fileRepository
                .findById(fileId)
                .filter(f -> f.getOwnerId().equals(user.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Archivo no encontrado"));
    }

    private static WorkspaceTemplate parseTemplate(String raw) {
        if (raw == null || raw.isBlank()) {
            return WorkspaceTemplate.FREE;
        }
        try {
            return WorkspaceTemplate.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return WorkspaceTemplate.FREE;
        }
    }

    private static InboxItem.Kind parseInboxKind(String content, String kind) {
        if (kind != null && !kind.isBlank()) {
            try {
                return InboxItem.Kind.valueOf(kind.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.startsWith("!")) {
            return InboxItem.Kind.TASK;
        }
        if (trimmed.matches("(?i)https?://\\S+")) {
            return InboxItem.Kind.LINK;
        }
        return InboxItem.Kind.NOTE;
    }

    public static boolean isDoneColumn(String columnName) {
        return columnName != null && DONE_COLUMNS.contains(columnName.trim().toLowerCase());
    }
}
