package site.sorbits.spacework;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.dto.AddFileCommentRequest;
import site.sorbits.spacework.dto.FileCommentResponse;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpaceworkCommentService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectItemRepository itemRepository;
    private final ProjectFileCommentRepository commentRepository;
    private final ProjectActivityRepository activityRepository;
    private final StoredFileRepository fileRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkCommentStreamHub streamHub;
    private final NotificationService notifications;

    public SpaceworkCommentService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectItemRepository itemRepository,
            ProjectFileCommentRepository commentRepository,
            ProjectActivityRepository activityRepository,
            StoredFileRepository fileRepository,
            UserAccountRepository userRepository,
            SpaceworkCommentStreamHub streamHub,
            NotificationService notifications) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.itemRepository = itemRepository;
        this.commentRepository = commentRepository;
        this.activityRepository = activityRepository;
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
        this.streamHub = streamHub;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<FileCommentResponse> listComments(UserAccount user, long projectId, long fileId) {
        requireLinkedFile(user, projectId, fileId);
        List<ProjectFileComment> rows =
                commentRepository.findByProjectIdAndFileIdOrderByCreatedAtAsc(projectId, fileId);
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<Long> authorIds =
                rows.stream().map(ProjectFileComment::getAuthorUserId).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return rows.stream()
                .map(c -> new FileCommentResponse(
                        c.getId(),
                        c.getFileId(),
                        names.getOrDefault(c.getAuthorUserId(), "?"),
                        c.getContent(),
                        c.getCreatedAt()))
                .toList();
    }

    @Transactional
    public FileCommentResponse addComment(
            UserAccount user, long projectId, long fileId, AddFileCommentRequest req) {
        ProjectMember membership = requireLinkedFile(user, projectId, fileId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes comentar");
        }
        String content = req.content().trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Comentario vacío");
        }
        var saved = commentRepository.save(ProjectFileComment.create(projectId, fileId, user.getId(), content));
        String fileName = fileRepository
                .findById(fileId)
                .map(f -> f.getOriginalName())
                .orElse("archivo");
        activityRepository.save(ProjectActivity.of(
                projectId,
                user.getId(),
                "COMMENT_ADDED",
                "Comentó en «" + fileName + "»",
                "FILE",
                fileId));
        FileCommentResponse response = new FileCommentResponse(
                saved.getId(), saved.getFileId(), user.getUsername(), saved.getContent(), saved.getCreatedAt());
        streamHub.broadcastComment(projectId, fileId, response);
        String projectName = projectRepository
                .findById(projectId)
                .map(Project::getName)
                .orElse("Proyecto");
        notifications.notifyFileComment(user, projectId, projectName, fileId, fileName, content);
        return response;
    }

    @Transactional
    public void deleteComment(UserAccount user, long projectId, long fileId, long commentId) {
        ProjectMember membership = requireLinkedFile(user, projectId, fileId);
        ProjectFileComment comment = commentRepository
                .findByIdAndProjectIdAndFileId(commentId, projectId, fileId)
                .orElseThrow(() -> new IllegalArgumentException("Comentario no encontrado"));
        boolean canDelete = user.getId().equals(comment.getAuthorUserId())
                || membership.getRole().canManageMembers();
        if (!canDelete) {
            throw new SpaceworkAccessDeniedException("No puedes borrar este comentario");
        }
        commentRepository.delete(comment);
        streamHub.broadcastDeleted(projectId, fileId, commentId);
    }

    public SseEmitter subscribeStream(UserAccount user, long projectId, long fileId) {
        requireLinkedFile(user, projectId, fileId);
        return streamHub.subscribe(projectId, fileId);
    }

    private ProjectMember requireLinkedFile(UserAccount user, long projectId, long fileId) {
        requireProject(projectId);
        ProjectMember membership = requireMembership(user, projectId);
        if (!itemRepository.findByProjectIdAndFileId(projectId, fileId).isPresent()) {
            throw new IllegalArgumentException("Ese archivo no está en el proyecto");
        }
        return membership;
    }

    private Project requireProject(long projectId) {
        return projectRepository
                .findById(projectId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
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
}
