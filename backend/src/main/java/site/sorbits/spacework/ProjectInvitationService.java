package site.sorbits.spacework;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.mail.InvitationMailService;
import site.sorbits.notification.NotificationService;
import site.sorbits.spacework.dto.InvitationDtos.CreateInvitationRequest;
import site.sorbits.spacework.dto.InvitationDtos.InvitationPreviewResponse;
import site.sorbits.spacework.dto.InvitationDtos.InvitationResponse;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProjectInvitationService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectInvitationRepository invitationRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkService spaceworkService;
    private final NotificationService notifications;
    private final InvitationMailService invitationMail;
    private final String publicBaseUrl;

    public ProjectInvitationService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectInvitationRepository invitationRepository,
            UserAccountRepository userRepository,
            SpaceworkService spaceworkService,
            NotificationService notifications,
            InvitationMailService invitationMail,
            @Value("${sorbits.public-base-url:https://app.sorbits.site}") String publicBaseUrl) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.spaceworkService = spaceworkService;
        this.notifications = notifications;
        this.invitationMail = invitationMail;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/$", "");
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> listPending(UserAccount user, long projectId) {
        ProjectMember actor = spaceworkService.requireMembershipForService(user, projectId);
        if (!actor.getRole().canManageMembers()) {
            throw new SpaceworkAccessDeniedException("No puedes ver invitaciones");
        }
        Project project = requireTeamProject(projectId);
        return mapInvitations(
                invitationRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(
                        projectId, InvitationStatus.PENDING),
                project.getName());
    }

    @Transactional
    public InvitationResponse create(UserAccount user, long projectId, CreateInvitationRequest req) {
        ProjectMember actor = spaceworkService.requireMembershipForService(user, projectId);
        if (!actor.getRole().canManageMembers()) {
            throw new SpaceworkAccessDeniedException("No puedes invitar miembros");
        }
        Project project = requireTeamProject(projectId);
        ProjectRole role = parseRole(req.role());
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);

        boolean hasUsername = req.username() != null && !req.username().isBlank();
        boolean hasEmail = req.email() != null && !req.email().isBlank();
        if (hasUsername == hasEmail) {
            throw new IllegalArgumentException("Indica username o email, no ambos");
        }

        ProjectInvitation saved;
        if (hasUsername) {
            UserAccount invitee = userRepository
                    .findByUsername(req.username().trim())
                    .filter(UserAccount::isActive)
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
            if (memberRepository.existsByProjectIdAndUserId(projectId, invitee.getId())) {
                throw new IllegalArgumentException("Ese usuario ya es miembro");
            }
            if (invitationRepository.existsByProjectIdAndInviteeUserIdAndStatus(
                    projectId, invitee.getId(), InvitationStatus.PENDING)) {
                throw new IllegalArgumentException("Ya hay una invitación pendiente para ese usuario");
            }
            saved = invitationRepository.save(ProjectInvitation.forUser(
                    projectId, user.getId(), invitee.getId(), role, expiresAt));
            notifications.notifyProjectInvitation(
                    user,
                    projectId,
                    project.getName(),
                    invitee.getId(),
                    role.name(),
                    saved.getId());
        } else {
            String email = req.email().trim().toLowerCase();
            if (invitationRepository.existsByProjectIdAndEmailIgnoreCaseAndStatus(
                    projectId, email, InvitationStatus.PENDING)) {
                throw new IllegalArgumentException("Ya hay una invitación pendiente para ese email");
            }
            saved = invitationRepository.save(ProjectInvitation.forEmail(
                    projectId, user.getId(), email, role, expiresAt));
            InvitationResponse response = toResponse(saved, project.getName());
            invitationMail.sendProjectInvitation(
                    email, user.getUsername(), project.getName(), response.inviteUrl());
            return response;
        }

        return toResponse(saved, project.getName());
    }

    @Transactional
    public void cancel(UserAccount user, long projectId, long invitationId) {
        ProjectMember actor = spaceworkService.requireMembershipForService(user, projectId);
        if (!actor.getRole().canManageMembers()) {
            throw new SpaceworkAccessDeniedException("No puedes cancelar invitaciones");
        }
        ProjectInvitation inv = invitationRepository
                .findById(invitationId)
                .filter(i -> i.getProjectId().equals(projectId))
                .orElseThrow(() -> new IllegalArgumentException("Invitación no encontrada"));
        if (!inv.isPending()) {
            throw new IllegalArgumentException("La invitación ya no está pendiente");
        }
        inv.markDeclined();
        invitationRepository.save(inv);
    }

    @Transactional(readOnly = true)
    public InvitationPreviewResponse preview(String token) {
        ProjectInvitation inv = requirePendingInvitation(token);
        Project project = projectRepository
                .findById(inv.getProjectId())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
        String inviterName = userRepository
                .findById(inv.getInviterId())
                .map(UserAccount::getUsername)
                .orElse("?");
        return new InvitationPreviewResponse(
                inv.getId(),
                inv.getProjectId(),
                project.getName(),
                inviterName,
                inv.getRole().name(),
                inv.getStatus().name(),
                inv.getEmail(),
                inv.isExpired(),
                registrationRequired(inv));
    }

    @Transactional
    public void validateEmailForRegistration(String token, String email) {
        ProjectInvitation inv = requirePendingInvitation(token);
        if (inv.getEmail() == null) {
            throw new IllegalArgumentException("Esta invitación no es por email");
        }
        if (!inv.getEmail().equalsIgnoreCase(email.trim())) {
            throw new IllegalArgumentException("El email debe coincidir con la invitación");
        }
    }

    @Transactional
    public void acceptAfterRegistration(UserAccount user, String token) {
        accept(user, token);
    }

    @Transactional
    public InvitationResponse accept(UserAccount user, String token) {
        ProjectInvitation inv = requirePendingInvitation(token);
        validateInvitee(user, inv);
        if (memberRepository.existsByProjectIdAndUserId(inv.getProjectId(), user.getId())) {
            inv.markAccepted();
            invitationRepository.save(inv);
            throw new IllegalArgumentException("Ya eres miembro de este proyecto");
        }
        memberRepository.save(ProjectMember.create(inv.getProjectId(), user.getId(), inv.getRole()));
        inv.markAccepted();
        invitationRepository.save(inv);
        Project project = projectRepository.findById(inv.getProjectId()).orElseThrow();
        return toResponse(inv, project.getName());
    }

    @Transactional
    public void decline(UserAccount user, String token) {
        ProjectInvitation inv = requirePendingInvitation(token);
        validateInvitee(user, inv);
        inv.markDeclined();
        invitationRepository.save(inv);
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void expireInvitations() {
        List<ProjectInvitation> expired = invitationRepository.findByStatusAndExpiresAtBefore(
                InvitationStatus.PENDING, Instant.now());
        for (ProjectInvitation inv : expired) {
            inv.markExpired();
        }
        invitationRepository.saveAll(expired);
    }

    private Project requireTeamProject(long projectId) {
        Project project = projectRepository
                .findById(projectId)
                .filter(p -> !p.isArchived())
                .orElseThrow(() -> new ProjectNotFoundException("Proyecto no encontrado"));
        if (project.isPersonal()) {
            throw new SpaceworkAccessDeniedException("Los espacios personales no admiten invitaciones");
        }
        return project;
    }

    private ProjectInvitation requirePendingInvitation(String token) {
        ProjectInvitation inv = invitationRepository
                .findByToken(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invitación no encontrada"));
        if (!inv.isPending()) {
            throw new IllegalArgumentException("Invitación no disponible");
        }
        if (inv.isExpired()) {
            inv.markExpired();
            invitationRepository.save(inv);
            throw new IllegalArgumentException("Invitación expirada");
        }
        return inv;
    }

    private void validateInvitee(UserAccount user, ProjectInvitation inv) {
        if (inv.getInviteeUserId() != null && !inv.getInviteeUserId().equals(user.getId())) {
            throw new SpaceworkAccessDeniedException("Esta invitación no es para tu cuenta");
        }
        if (inv.getEmail() != null) {
            String userEmail = user.getEmail();
            if (userEmail == null || !userEmail.equalsIgnoreCase(inv.getEmail())) {
                throw new SpaceworkAccessDeniedException("Esta invitación es para otro email");
            }
        }
    }

    private boolean registrationRequired(ProjectInvitation inv) {
        if (inv.getEmail() == null) {
            return false;
        }
        return userRepository.findByEmailIgnoreCase(inv.getEmail()).filter(UserAccount::isActive).isEmpty();
    }

    private static ProjectRole parseRole(String raw) {
        if (raw == null || raw.isBlank()) {
            return ProjectRole.MEMBER;
        }
        ProjectRole role = ProjectRole.valueOf(raw.trim().toUpperCase());
        if (role == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede invitar como OWNER");
        }
        return role;
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> listForInvitee(UserAccount user) {
        java.util.LinkedHashMap<Long, ProjectInvitation> merged = new java.util.LinkedHashMap<>();
        invitationRepository
                .findByInviteeUserIdAndStatusOrderByCreatedAtDesc(user.getId(), InvitationStatus.PENDING)
                .forEach(i -> merged.putIfAbsent(i.getId(), i));
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            invitationRepository
                    .findByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
                            user.getEmail().trim(), InvitationStatus.PENDING)
                    .forEach(i -> merged.putIfAbsent(i.getId(), i));
        }
        return mapInvitations(List.copyOf(merged.values()), "");
    }

    @Transactional
    public InvitationResponse acceptById(UserAccount user, long invitationId) {
        ProjectInvitation inv = invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitación no encontrada"));
        if (inv.getInviteeUserId() != null && !user.getId().equals(inv.getInviteeUserId())) {
            throw new SpaceworkAccessDeniedException("Esta invitación no es para tu cuenta");
        }
        if (inv.getEmail() != null) {
            String userEmail = user.getEmail();
            if (userEmail == null || !userEmail.equalsIgnoreCase(inv.getEmail())) {
                throw new SpaceworkAccessDeniedException("Esta invitación es para otro email");
            }
        }
        return accept(user, inv.getToken());
    }

    @Transactional
    public void declineById(UserAccount user, long invitationId) {
        ProjectInvitation inv = invitationRepository
                .findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitación no encontrada"));
        if (inv.getInviteeUserId() != null && !user.getId().equals(inv.getInviteeUserId())) {
            throw new SpaceworkAccessDeniedException("Esta invitación no es para tu cuenta");
        }
        if (inv.getEmail() != null) {
            String userEmail = user.getEmail();
            if (userEmail == null || !userEmail.equalsIgnoreCase(inv.getEmail())) {
                throw new SpaceworkAccessDeniedException("Esta invitación es para otro email");
            }
        }
        decline(user, inv.getToken());
    }

    private List<InvitationResponse> mapInvitations(List<ProjectInvitation> rows, String projectName) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<Long> projectIds = rows.stream().map(ProjectInvitation::getProjectId).collect(Collectors.toSet());
        Map<Long, String> projectNames = projectRepository.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));
        Set<Long> userIds = rows.stream()
                .flatMap(i -> java.util.stream.Stream.of(i.getInviterId(), i.getInviteeUserId()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return rows.stream()
                .map(i -> InvitationResponse.fromSummary(
                        i,
                        projectName.isBlank()
                                ? projectNames.getOrDefault(i.getProjectId(), "?")
                                : projectName,
                        names.getOrDefault(i.getInviterId(), "?"),
                        i.getInviteeUserId() == null ? null : names.getOrDefault(i.getInviteeUserId(), "?")))
                .toList();
    }

    private InvitationResponse toResponse(ProjectInvitation inv, String projectName) {
        String inviteeName = inv.getInviteeUserId() == null
                ? null
                : userRepository
                        .findById(inv.getInviteeUserId())
                        .map(UserAccount::getUsername)
                        .orElse("?");
        String inviterName = userRepository
                .findById(inv.getInviterId())
                .map(UserAccount::getUsername)
                .orElse("?");
        return InvitationResponse.from(inv, projectName, inviterName, inviteeName, publicBaseUrl);
    }
}
