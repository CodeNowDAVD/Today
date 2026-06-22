package site.sorbits.spacework;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.dto.*;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpaceworkWikiService {

    private static final String DEFAULT_SLUG = "inicio";
    private static final String DEFAULT_TITLE = "Inicio";
    private static final String DEFAULT_CONTENT =
            "# Bienvenido\n\nDocumentación colaborativa del proyecto. Edita esta página o crea nuevas.";

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectWikiPageRepository pageRepository;
    private final ProjectActivityRepository activityRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkWikiStreamHub streamHub;

    public SpaceworkWikiService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectWikiPageRepository pageRepository,
            ProjectActivityRepository activityRepository,
            UserAccountRepository userRepository,
            SpaceworkWikiStreamHub streamHub) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.pageRepository = pageRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.streamHub = streamHub;
    }

    @Transactional
    public void seedDefaultPage(long projectId, long authorUserId) {
        if (pageRepository.existsByProjectIdAndSlug(projectId, DEFAULT_SLUG)) {
            return;
        }
        try {
            pageRepository.save(
                    ProjectWikiPage.create(projectId, DEFAULT_SLUG, DEFAULT_TITLE, DEFAULT_CONTENT, authorUserId));
        } catch (org.springframework.dao.DataIntegrityViolationException ignored) {
            // Carrera entre listPages y getPage en paralelo.
        }
    }

    @Transactional
    public List<WikiPageSummaryResponse> listPages(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        seedDefaultPage(projectId, user.getId());
        return mapSummaries(pageRepository.findByProjectIdOrderByTitleAsc(projectId));
    }

    @Transactional
    public WikiPageResponse getPage(UserAccount user, long projectId, String slug) {
        requireMembership(user, projectId);
        seedDefaultPage(projectId, user.getId());
        ProjectWikiPage page = pageRepository
                .findByProjectIdAndSlug(projectId, normalizeSlug(slug))
                .orElseThrow(() -> new WikiPageNotFoundException("Página no encontrada"));
        return toPageResponse(page);
    }

    @Transactional
    public WikiPageResponse createPage(UserAccount user, long projectId, CreateWikiPageRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes crear páginas");
        }
        String slug = normalizeSlug(req.slug());
        if (pageRepository.existsByProjectIdAndSlug(projectId, slug)) {
            throw new IllegalArgumentException("Ya existe una página con ese slug");
        }
        var saved = pageRepository.save(
                ProjectWikiPage.create(projectId, slug, req.title(), req.content(), user.getId()));
        WikiPageResponse response = toPageResponse(saved);
        streamHub.broadcastPage(projectId, response);
        logActivity(projectId, user.getId(), "WIKI_CREATED", "Creó la wiki «" + saved.getTitle() + "»");
        return response;
    }

    @Transactional
    public WikiPageResponse updatePage(
            UserAccount user, long projectId, String slug, UpdateWikiPageRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes editar páginas");
        }
        ProjectWikiPage page = requirePage(projectId, slug);
        String title = req.title() != null ? req.title() : page.getTitle();
        if (title.isBlank()) {
            throw new IllegalArgumentException("Título vacío");
        }
        String content = req.content() != null ? req.content() : page.getContent();
        page.update(title, content, user.getId());
        page = pageRepository.save(page);
        WikiPageResponse response = toPageResponse(page);
        streamHub.broadcastPage(projectId, response);
        logActivity(projectId, user.getId(), "WIKI_UPDATED", "Actualizó «" + page.getTitle() + "»");
        return response;
    }

    @Transactional
    public void deletePage(UserAccount user, long projectId, String slug) {
        ProjectMember membership = requireMembership(user, projectId);
        if (!membership.getRole().canEditProject()) {
            throw new SpaceworkAccessDeniedException("No puedes borrar páginas wiki");
        }
        ProjectWikiPage page = requirePage(projectId, slug);
        if (DEFAULT_SLUG.equals(page.getSlug())) {
            throw new IllegalArgumentException("No se puede borrar la página de inicio");
        }
        pageRepository.delete(page);
        streamHub.broadcastDeleted(projectId, page.getSlug());
        logActivity(projectId, user.getId(), "WIKI_DELETED", "Eliminó una página wiki");
    }

    public SseEmitter subscribeStream(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        return streamHub.subscribe(projectId);
    }

    private ProjectWikiPage requirePage(long projectId, String slug) {
        return pageRepository
                .findByProjectIdAndSlug(projectId, normalizeSlug(slug))
                .orElseThrow(() -> new WikiPageNotFoundException("Página no encontrada"));
    }

    private static String normalizeSlug(String raw) {
        String slug = raw.trim().toLowerCase();
        if (slug.isEmpty() || !slug.matches("[a-z0-9][a-z0-9_-]{0,78}")) {
            throw new IllegalArgumentException("Slug inválido (usa letras, números, guión o guión bajo)");
        }
        return slug;
    }

    private List<WikiPageSummaryResponse> mapSummaries(List<ProjectWikiPage> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = rows.stream().map(ProjectWikiPage::getUpdatedBy).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return rows.stream()
                .map(p -> new WikiPageSummaryResponse(
                        p.getId(),
                        p.getSlug(),
                        p.getTitle(),
                        names.getOrDefault(p.getUpdatedBy(), "?"),
                        p.getUpdatedAt()))
                .toList();
    }

    private WikiPageResponse toPageResponse(ProjectWikiPage p) {
        Set<Long> ids = new HashSet<>();
        ids.add(p.getCreatedBy());
        ids.add(p.getUpdatedBy());
        Map<Long, String> names = userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        return new WikiPageResponse(
                p.getId(),
                p.getSlug(),
                p.getTitle(),
                p.getContent(),
                names.getOrDefault(p.getCreatedBy(), "?"),
                names.getOrDefault(p.getUpdatedBy(), "?"),
                p.getCreatedAt(),
                p.getUpdatedAt());
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

    private void logActivity(long projectId, long actorUserId, String type, String summary) {
        activityRepository.save(ProjectActivity.of(projectId, actorUserId, type, summary, "WIKI", null));
    }
}
