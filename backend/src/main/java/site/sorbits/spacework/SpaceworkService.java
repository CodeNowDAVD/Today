package site.sorbits.spacework;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.files.StoredFile;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.links.SavedLink;
import site.sorbits.links.SavedLinkRepository;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.dto.*;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpaceworkService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectItemRepository itemRepository;
    private final ProjectActivityRepository activityRepository;
    private final UserAccountRepository userRepository;
    private final StoredFileRepository fileRepository;
    private final SavedLinkRepository linkRepository;
    private final ProjectChannelRepository channelRepository;
    private final ProjectFileCommentRepository commentRepository;
    private final SpaceworkBoardService boardService;
    private final SpaceworkWikiService wikiService;
    private final NotificationService notifications;

    public SpaceworkService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectItemRepository itemRepository,
            ProjectActivityRepository activityRepository,
            UserAccountRepository userRepository,
            StoredFileRepository fileRepository,
            SavedLinkRepository linkRepository,
            ProjectChannelRepository channelRepository,
            ProjectFileCommentRepository commentRepository,
            SpaceworkBoardService boardService,
            SpaceworkWikiService wikiService,
            NotificationService notifications) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.itemRepository = itemRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.fileRepository = fileRepository;
        this.linkRepository = linkRepository;
        this.channelRepository = channelRepository;
        this.commentRepository = commentRepository;
        this.boardService = boardService;
        this.wikiService = wikiService;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> listProjects(UserAccount user) {
        List<Project> projects = projectRepository.findActiveForMember(user.getId());
        if (projects.isEmpty()) {
            return List.of();
        }
        Map<Long, ProjectMember> myMembership = memberRepository.findByUserId(user.getId()).stream()
                .collect(Collectors.toMap(ProjectMember::getProjectId, m -> m, (a, b) -> a));
        Set<Long> creatorIds =
                projects.stream().map(Project::getCreatedBy).collect(Collectors.toSet());
        Map<Long, String> usernames = userRepository.findAllById(creatorIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return projects.stream()
                .map(p -> toProjectResponse(
                        p,
                        usernames.getOrDefault(p.getCreatedBy(), "?"),
                        myMembership.get(p.getId()),
                        memberRepository.countByProjectId(p.getId()),
                        itemRepository.countByProjectId(p.getId())))
                .toList();
    }

    @Transactional
    public ProjectResponse createProject(UserAccount user, CreateProjectRequest req) {
        Project project = projectRepository.save(Project.create(user.getId(), req.name(), req.description()));
        memberRepository.save(ProjectMember.create(project.getId(), user.getId(), ProjectRole.OWNER));
        channelRepository.save(ProjectChannel.create(project.getId(), "general", "Canal general", true));
        boardService.seedDefaultBoard(project.getId());
        wikiService.seedDefaultPage(project.getId(), user.getId());
        logActivity(
                project.getId(),
                user.getId(),
                "PROJECT_CREATED",
                "Creó el proyecto «" + project.getName() + "»",
                "PROJECT",
                project.getId());
        return toProjectResponse(project, user.getUsername(), ProjectRole.OWNER, 1, 0);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UserAccount user, long projectId) {
        Project project = requireProject(projectId);
        ProjectMember membership = requireMembership(user, projectId);
        String creatorName = userRepository
                .findById(project.getCreatedBy())
                .map(UserAccount::getUsername)
                .orElse("?");
        return toProjectResponse(
                project,
                creatorName,
                membership,
                memberRepository.countByProjectId(projectId),
                itemRepository.countByProjectId(projectId));
    }

    @Transactional
    public ProjectResponse updateProject(UserAccount user, long projectId, UpdateProjectRequest req) {
        Project project = requireProject(projectId);
        ProjectMember membership = requireMembership(user, projectId);
        if (!membership.getRole().canEditProject()) {
            throw new SpaceworkAccessDeniedException("No puedes editar este proyecto");
        }
        project.update(req.name(), req.description());
        projectRepository.save(project);
        logActivity(
                projectId,
                user.getId(),
                "PROJECT_UPDATED",
                "Actualizó el proyecto",
                "PROJECT",
                projectId);
        return getProject(user, projectId);
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        List<ProjectMember> members = memberRepository.findByProjectIdOrderByJoinedAtAsc(projectId);
        Set<Long> userIds = members.stream().map(ProjectMember::getUserId).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return members.stream()
                .map(m -> new MemberResponse(
                        m.getUserId(),
                        names.getOrDefault(m.getUserId(), "?"),
                        m.getRole().name(),
                        m.getJoinedAt()))
                .toList();
    }

    @Transactional
    public MemberResponse addMember(UserAccount user, long projectId, AddMemberRequest req) {
        Project project = requireProject(projectId);
        if (project.isPersonal()) {
            throw new SpaceworkAccessDeniedException("Los espacios personales no admiten invitaciones");
        }
        ProjectMember actor = requireMembership(user, projectId);
        if (!actor.getRole().canManageMembers()) {
            throw new SpaceworkAccessDeniedException("No puedes invitar miembros");
        }
        if (req.role() == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede asignar rol OWNER al invitar");
        }
        UserAccount invitee = userRepository
                .findByUsername(req.username().trim())
                .filter(UserAccount::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (memberRepository.existsByProjectIdAndUserId(projectId, invitee.getId())) {
            throw new IllegalArgumentException("Ese usuario ya es miembro");
        }
        ProjectMember saved =
                memberRepository.save(ProjectMember.create(projectId, invitee.getId(), req.role()));
        logActivity(
                projectId,
                user.getId(),
                "MEMBER_ADDED",
                "Invitó a " + invitee.getUsername() + " como " + req.role().name(),
                "MEMBER",
                invitee.getId());
        notifications.notifyMemberAdded(user, projectId, project.getName(), invitee.getId());
        return new MemberResponse(
                saved.getUserId(), invitee.getUsername(), saved.getRole().name(), saved.getJoinedAt());
    }

    @Transactional
    public void removeMember(UserAccount user, long projectId, long targetUserId) {
        ProjectMember actor = requireMembership(user, projectId);
        ProjectMember target = memberRepository
                .findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Miembro no encontrado"));
        if (target.getRole() == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede quitar al dueño del proyecto");
        }
        if (!actor.getRole().canManageMembers() && !user.getId().equals(targetUserId)) {
            throw new SpaceworkAccessDeniedException("No puedes quitar miembros");
        }
        String targetName = userRepository
                .findById(targetUserId)
                .map(UserAccount::getUsername)
                .orElse("?");
        memberRepository.delete(target);
        logActivity(
                projectId,
                user.getId(),
                "MEMBER_REMOVED",
                "Quitó a " + targetName + " del proyecto",
                "MEMBER",
                targetUserId);
    }

    @Transactional
    public MemberResponse updateMemberRole(
            UserAccount user, long projectId, long targetUserId, UpdateMemberRoleRequest req) {
        ProjectMember actor = requireMembership(user, projectId);
        if (!actor.getRole().canManageMembers()) {
            throw new SpaceworkAccessDeniedException("No puedes cambiar roles");
        }
        if (req.role() == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede asignar rol OWNER");
        }
        ProjectMember target = memberRepository
                .findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Miembro no encontrado"));
        if (target.getRole() == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede cambiar el rol del dueño");
        }
        target.setRole(req.role());
        memberRepository.save(target);
        String targetName = userRepository
                .findById(targetUserId)
                .map(UserAccount::getUsername)
                .orElse("?");
        logActivity(
                projectId,
                user.getId(),
                "MEMBER_ROLE_CHANGED",
                "Cambió el rol de " + targetName + " a " + req.role().name(),
                "MEMBER",
                targetUserId);
        return new MemberResponse(
                target.getUserId(), targetName, target.getRole().name(), target.getJoinedAt());
    }

    @Transactional(readOnly = true)
    public List<ProjectItemResponse> listItems(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        List<ProjectItem> items = itemRepository.findByProjectIdOrderByAddedAtDesc(projectId);
        if (items.isEmpty()) {
            return List.of();
        }
        Set<Long> fileIds = new HashSet<>();
        Set<Long> linkIds = new HashSet<>();
        Set<Long> userIds = new HashSet<>();
        for (ProjectItem item : items) {
            userIds.add(item.getAddedBy());
            if (item.getFileId() != null) fileIds.add(item.getFileId());
            if (item.getLinkId() != null) linkIds.add(item.getLinkId());
        }
        Map<Long, StoredFile> files = fileRepository.findAllById(fileIds).stream()
                .collect(Collectors.toMap(StoredFile::getId, f -> f));
        Map<Long, SavedLink> links = linkRepository.findAllById(linkIds).stream()
                .collect(Collectors.toMap(SavedLink::getId, l -> l));
        for (StoredFile f : files.values()) userIds.add(f.getOwnerId());
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return items.stream()
                .map(item -> toItemResponse(item, files, links, names))
                .toList();
    }

    @Transactional
    public ProjectItemResponse addItem(UserAccount user, long projectId, AddProjectItemRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (!membership.getRole().canAddItems()) {
            throw new SpaceworkAccessDeniedException("No puedes añadir elementos");
        }
        boolean hasFile = req.fileId() != null;
        boolean hasLink = req.linkId() != null;
        if (hasFile == hasLink) {
            throw new IllegalArgumentException("Indica fileId o linkId, no ambos");
        }
        ProjectItem item;
        String summary;
        if (hasFile) {
            StoredFile file = fileRepository
                    .findById(req.fileId())
                    .orElseThrow(() -> new IllegalArgumentException("Archivo no encontrado"));
            if (file.isTrashed()) {
                throw new IllegalArgumentException("No se puede enlazar un archivo en papelera");
            }
            if (!ownsOrAdmin(user, file.getOwnerId())) {
                throw new SpaceworkAccessDeniedException("Solo puedes compartir tus propios archivos");
            }
            if (itemRepository.findByProjectIdAndFileId(projectId, file.getId()).isPresent()) {
                throw new IllegalArgumentException("Ese archivo ya está en el proyecto");
            }
            item = itemRepository.save(ProjectItem.file(projectId, file.getId(), user.getId()));
            summary = "Añadió el archivo «" + file.getOriginalName() + "»";
            logActivity(projectId, user.getId(), "ITEM_ADDED", summary, "FILE", file.getId());
        } else {
            SavedLink link = linkRepository
                    .findById(req.linkId())
                    .orElseThrow(() -> new IllegalArgumentException("Enlace no encontrado"));
            if (!ownsOrAdmin(user, link.getOwnerId())) {
                throw new SpaceworkAccessDeniedException("Solo puedes compartir tus propios enlaces");
            }
            if (itemRepository.findByProjectIdAndLinkId(projectId, link.getId()).isPresent()) {
                throw new IllegalArgumentException("Ese enlace ya está en el proyecto");
            }
            item = itemRepository.save(ProjectItem.link(projectId, link.getId(), user.getId()));
            summary = "Añadió el enlace «" + link.getTitle() + "»";
            logActivity(projectId, user.getId(), "ITEM_ADDED", summary, "LINK", link.getId());
        }
        return listItems(user, projectId).stream()
                .filter(i -> i.id() == item.getId())
                .findFirst()
                .orElseThrow();
    }

    @Transactional
    public void removeItem(UserAccount user, long projectId, long itemId) {
        ProjectMember membership = requireMembership(user, projectId);
        ProjectItem item = itemRepository
                .findById(itemId)
                .filter(i -> i.getProjectId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Elemento no encontrado"));
        boolean canRemove = membership.getRole().canRemoveAnyItem()
                || user.getId().equals(item.getAddedBy());
        if (!canRemove) {
            throw new SpaceworkAccessDeniedException("No puedes quitar este elemento");
        }
        itemRepository.delete(item);
        logActivity(
                projectId,
                user.getId(),
                "ITEM_REMOVED",
                "Quitó un elemento del proyecto",
                item.getFileId() != null ? "FILE" : "LINK",
                item.getFileId() != null ? item.getFileId() : item.getLinkId());
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> listActivity(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        List<ProjectActivity> rows = activityRepository.findTop50ByProjectIdOrderByCreatedAtDesc(projectId);
        Set<Long> actorIds =
                rows.stream().map(ProjectActivity::getActorUserId).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(actorIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return rows.stream()
                .map(a -> new ActivityResponse(
                        a.getId(),
                        names.getOrDefault(a.getActorUserId(), "?"),
                        a.getActivityType(),
                        a.getSummary(),
                        a.getCreatedAt()))
                .toList();
    }

    public boolean canViewFileViaProject(UserAccount user, long fileId) {
        if (user.getRole() == Role.ADMIN) {
            return true;
        }
        return itemRepository.memberCanAccessFile(fileId, user.getId());
    }

    @Transactional
    public void onFileMovedToTrash(long fileId) {
        itemRepository.deleteByFileId(fileId);
        commentRepository.deleteByFileId(fileId);
    }

    @Transactional
    public void archiveProject(UserAccount user, long projectId) {
        Project project = requireProject(projectId);
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() != ProjectRole.OWNER && user.getRole() != Role.ADMIN) {
            throw new SpaceworkAccessDeniedException("Solo el dueño puede archivar el proyecto");
        }
        project.archive();
        projectRepository.save(project);
        logActivity(
                projectId,
                user.getId(),
                "PROJECT_ARCHIVED",
                "Archivó el proyecto «" + project.getName() + "»",
                "PROJECT",
                projectId);
    }

    private Project requireProject(long projectId) {
        return projectRepository
                .findById(projectId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
    }

    @Transactional
    public void transferOwnership(UserAccount user, long projectId, long newOwnerId) {
        ProjectMember actor = requireMembership(user, projectId);
        if (actor.getRole() != ProjectRole.OWNER) {
            throw new SpaceworkAccessDeniedException("Solo el dueño puede transferir la propiedad");
        }
        if (user.getId().equals(newOwnerId)) {
            throw new IllegalArgumentException("Ya eres el dueño");
        }
        ProjectMember target = memberRepository
                .findByProjectIdAndUserId(projectId, newOwnerId)
                .orElseThrow(() -> new IllegalArgumentException("Miembro no encontrado"));
        actor.setRole(ProjectRole.ADMIN);
        target.setRole(ProjectRole.OWNER);
        memberRepository.save(actor);
        memberRepository.save(target);
        Project project = requireProject(projectId);
        project.transferOwnership(newOwnerId);
        projectRepository.save(project);
        String targetName = userRepository
                .findById(newOwnerId)
                .map(UserAccount::getUsername)
                .orElse("?");
        logActivity(
                projectId,
                user.getId(),
                "OWNERSHIP_TRANSFERRED",
                "Transfirió la propiedad a " + targetName,
                "PROJECT",
                projectId);
    }

    public ProjectMember requireMembershipForService(UserAccount user, long projectId) {
        return requireMembership(user, projectId);
    }

    private ProjectMember requireMembership(UserAccount user, long projectId) {
        if (user.getRole() == Role.ADMIN) {
            return memberRepository
                    .findByProjectIdAndUserId(projectId, user.getId())
                    .orElseGet(() -> ProjectMember.create(projectId, user.getId(), ProjectRole.ADMIN));
        }
        return memberRepository
                .findByProjectIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new SpaceworkAccessDeniedException("No eres miembro de este proyecto"));
    }

    private boolean ownsOrAdmin(UserAccount user, Long ownerId) {
        return user.getRole() == Role.ADMIN || user.getId().equals(ownerId);
    }

    private void logActivity(
            long projectId,
            long actorUserId,
            String type,
            String summary,
            String entityType,
            Long entityId) {
        activityRepository.save(ProjectActivity.of(projectId, actorUserId, type, summary, entityType, entityId));
    }

    private ProjectResponse toProjectResponse(
            Project p, String creatorUsername, ProjectMember membership, long memberCount, long itemCount) {
        String role = membership == null ? "VIEWER" : membership.getRole().name();
        return new ProjectResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                creatorUsername,
                p.getCreatedAt(),
                role,
                (int) memberCount,
                (int) itemCount,
                p.getWorkspaceKind().name(),
                p.getTemplate() == null ? null : p.getTemplate().name());
    }

    private ProjectResponse toProjectResponse(
            Project p, String creatorUsername, ProjectRole role, int memberCount, int itemCount) {
        return new ProjectResponse(
                p.getId(),
                p.getName(),
                p.getDescription(),
                creatorUsername,
                p.getCreatedAt(),
                role.name(),
                memberCount,
                itemCount,
                p.getWorkspaceKind().name(),
                p.getTemplate() == null ? null : p.getTemplate().name());
    }

    private ProjectItemResponse toItemResponse(
            ProjectItem item,
            Map<Long, StoredFile> files,
            Map<Long, SavedLink> links,
            Map<Long, String> names) {
        if (item.getFileId() != null) {
            StoredFile f = files.get(item.getFileId());
            return new ProjectItemResponse(
                    item.getId(),
                    "FILE",
                    item.getFileId(),
                    f != null ? f.getOriginalName() : "(eliminado)",
                    f != null ? f.getContentType() : null,
                    f != null ? f.getSizeBytes() : null,
                    f != null ? names.getOrDefault(f.getOwnerId(), "?") : null,
                    null,
                    null,
                    null,
                    names.getOrDefault(item.getAddedBy(), "?"),
                    item.getAddedAt());
        }
        SavedLink l = links.get(item.getLinkId());
        return new ProjectItemResponse(
                item.getId(),
                "LINK",
                null,
                null,
                null,
                null,
                null,
                item.getLinkId(),
                l != null ? l.getTitle() : "(eliminado)",
                l != null ? l.getUrl() : null,
                names.getOrDefault(item.getAddedBy(), "?"),
                item.getAddedAt());
    }
}
