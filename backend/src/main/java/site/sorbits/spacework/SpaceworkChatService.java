package site.sorbits.spacework;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.dto.*;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpaceworkChatService {

    private static final int MESSAGE_PAGE_SIZE = 50;

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectChannelRepository channelRepository;
    private final ProjectMessageRepository messageRepository;
    private final ProjectActivityRepository activityRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkChatStreamHub streamHub;
    private final NotificationService notifications;

    public SpaceworkChatService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectChannelRepository channelRepository,
            ProjectMessageRepository messageRepository,
            ProjectActivityRepository activityRepository,
            UserAccountRepository userRepository,
            SpaceworkChatStreamHub streamHub,
            NotificationService notifications) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.channelRepository = channelRepository;
        this.messageRepository = messageRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.streamHub = streamHub;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ChannelResponse> listChannels(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        ensureDefaultChannel(projectId);
        return channelRepository.findByProjectIdOrderByIsDefaultDescNameAsc(projectId).stream()
                .map(this::toChannelResponse)
                .toList();
    }

    @Transactional
    public ChannelResponse createChannel(UserAccount user, long projectId, CreateChannelRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (!membership.getRole().canEditProject()) {
            throw new SpaceworkAccessDeniedException("No puedes crear canales");
        }
        String name = normalizeChannelName(req.name());
        if (channelRepository.existsByProjectIdAndName(projectId, name)) {
            throw new IllegalArgumentException("Ya existe un canal con ese nombre");
        }
        var saved = channelRepository.save(
                ProjectChannel.create(projectId, name, req.description(), false));
        logActivity(
                projectId,
                user.getId(),
                "CHANNEL_CREATED",
                "Creó el canal #" + name,
                "CHANNEL",
                saved.getId());
        return toChannelResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> listMessages(UserAccount user, long projectId, long channelId) {
        ProjectChannel channel = requireChannel(projectId, channelId);
        requireMembership(user, projectId);
        var page = PageRequest.of(0, MESSAGE_PAGE_SIZE);
        List<ProjectMessage> rows =
                messageRepository.findByChannelIdOrderByCreatedAtDesc(channel.getId(), page);
        if (rows.isEmpty()) {
            return List.of();
        }
        Collections.reverse(rows);
        Set<Long> authorIds =
                rows.stream().map(ProjectMessage::getAuthorUserId).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return rows.stream()
                .map(m -> new MessageResponse(
                        m.getId(),
                        m.getChannelId(),
                        names.getOrDefault(m.getAuthorUserId(), "?"),
                        m.getContent(),
                        m.getCreatedAt()))
                .toList();
    }

    @Transactional
    public MessageResponse sendMessage(
            UserAccount user, long projectId, long channelId, SendMessageRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes enviar mensajes");
        }
        ProjectChannel channel = requireChannel(projectId, channelId);
        String content = req.content().trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Mensaje vacío");
        }
        var saved = messageRepository.save(ProjectMessage.create(channel.getId(), user.getId(), content));
        MessageResponse response = new MessageResponse(
                saved.getId(), saved.getChannelId(), user.getUsername(), saved.getContent(), saved.getCreatedAt());
        streamHub.broadcast(channel.getId(), response);
        Project project = requireProject(projectId);
        notifications.notifyChatMessage(user, projectId, project.getName(), channel.getName(), content);
        return response;
    }

    public SseEmitter subscribeStream(UserAccount user, long projectId, long channelId) {
        requireChannel(projectId, channelId);
        requireMembership(user, projectId);
        return streamHub.subscribe(channelId);
    }

    @Transactional
    public void ensureDefaultChannel(long projectId) {
        if (channelRepository.existsByProjectIdAndName(projectId, "general")) {
            return;
        }
        channelRepository.save(ProjectChannel.create(projectId, "general", "Canal general", true));
    }

    private ProjectChannel requireChannel(long projectId, long channelId) {
        return channelRepository
                .findById(channelId)
                .filter(c -> c.getProjectId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Canal no encontrado"));
    }

    private Project requireProject(long projectId) {
        return projectRepository
                .findById(projectId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
    }

    private ProjectMember requireMembership(UserAccount user, long projectId) {
        requireProject(projectId);
        if (user.getRole() == Role.ADMIN) {
            return memberRepository
                    .findByProjectIdAndUserId(projectId, user.getId())
                    .orElseGet(() -> ProjectMember.create(projectId, user.getId(), ProjectRole.ADMIN));
        }
        return memberRepository
                .findByProjectIdAndUserId(projectId, user.getId())
                .orElseThrow(() -> new SpaceworkAccessDeniedException("No eres miembro de este proyecto"));
    }

    private static String normalizeChannelName(String raw) {
        String name = raw.trim().toLowerCase();
        if (name.isEmpty() || name.contains(" ")) {
            throw new IllegalArgumentException("Nombre de canal inválido");
        }
        if (!name.matches("[a-z0-9_-]{1,80}")) {
            throw new IllegalArgumentException("Usa letras, números, guión o guión bajo");
        }
        return name;
    }

    private ChannelResponse toChannelResponse(ProjectChannel c) {
        return new ChannelResponse(c.getId(), c.getName(), c.getDescription(), c.isDefault(), c.getCreatedAt());
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
}
