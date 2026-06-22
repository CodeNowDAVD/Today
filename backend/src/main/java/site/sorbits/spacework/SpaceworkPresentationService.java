package site.sorbits.spacework;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.files.StoredFile;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.spacework.dto.PresentationResponse;
import site.sorbits.spacework.dto.StartPresentationRequest;
import site.sorbits.spacework.dto.UpdatePresentationStateRequest;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class SpaceworkPresentationService {

    private static final TypeReference<List<Long>> FILE_IDS_TYPE = new TypeReference<>() {};

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository memberRepository;
    private final ProjectItemRepository itemRepository;
    private final ProjectPresentationRepository presentationRepository;
    private final ProjectActivityRepository activityRepository;
    private final StoredFileRepository fileRepository;
    private final UserAccountRepository userRepository;
    private final SpaceworkPresentationStreamHub streamHub;
    private final ObjectMapper objectMapper;

    public SpaceworkPresentationService(
            ProjectRepository projectRepository,
            ProjectMemberRepository memberRepository,
            ProjectItemRepository itemRepository,
            ProjectPresentationRepository presentationRepository,
            ProjectActivityRepository activityRepository,
            StoredFileRepository fileRepository,
            UserAccountRepository userRepository,
            SpaceworkPresentationStreamHub streamHub,
            ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.memberRepository = memberRepository;
        this.itemRepository = itemRepository;
        this.presentationRepository = presentationRepository;
        this.activityRepository = activityRepository;
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
        this.streamHub = streamHub;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Optional<PresentationResponse> getActive(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        return presentationRepository
                .findByProjectIdAndActiveTrue(projectId)
                .map(this::toResponse);
    }

    @Transactional
    public PresentationResponse start(UserAccount user, long projectId, StartPresentationRequest req) {
        ProjectMember membership = requireMembership(user, projectId);
        if (membership.getRole() == ProjectRole.VIEWER) {
            throw new SpaceworkAccessDeniedException("Solo lectura: no puedes iniciar presentaciones");
        }
        List<Long> fileIds = normalizeFileIds(req.fileIds());
        validateProjectFiles(projectId, fileIds);
        String json = writeFileIds(fileIds);

        ProjectPresentation presentation = presentationRepository
                .findByProjectId(projectId)
                .orElseGet(() -> ProjectPresentation.forProject(projectId));
        presentation.activate(user.getId(), json);
        presentation = presentationRepository.save(presentation);

        PresentationResponse response = toResponse(presentation);
        streamHub.broadcastState(projectId, response);
        logActivity(projectId, user.getId(), "PRESENTATION_STARTED", "Inició una presentación en vivo");
        return response;
    }

    @Transactional
    public PresentationResponse updateState(
            UserAccount user, long projectId, UpdatePresentationStateRequest req) {
        requireMembership(user, projectId);
        ProjectPresentation presentation = presentationRepository
                .findByProjectIdAndActiveTrue(projectId)
                .orElseThrow(() -> new IllegalArgumentException("No hay presentación activa"));
        if (!presentation.getHostUserId().equals(user.getId())) {
            throw new SpaceworkAccessDeniedException("Solo el presentador puede cambiar la diapositiva");
        }
        List<Long> fileIds = readFileIds(presentation.getFileIdsJson());
        int index = Math.min(req.currentFileIndex(), Math.max(0, fileIds.size() - 1));
        presentation.setCurrentFileIndex(index);
        presentation = presentationRepository.save(presentation);
        PresentationResponse response = toResponse(presentation);
        streamHub.broadcastState(projectId, response);
        return response;
    }

    @Transactional
    public void stop(UserAccount user, long projectId) {
        ProjectMember membership = requireMembership(user, projectId);
        ProjectPresentation presentation = presentationRepository
                .findByProjectIdAndActiveTrue(projectId)
                .orElseThrow(() -> new IllegalArgumentException("No hay presentación activa"));
        boolean isHost = presentation.getHostUserId().equals(user.getId());
        if (!isHost && !membership.getRole().canEditProject()) {
            throw new SpaceworkAccessDeniedException("No puedes finalizar esta presentación");
        }
        presentation.deactivate();
        presentationRepository.save(presentation);
        streamHub.broadcastStopped(projectId);
        logActivity(projectId, user.getId(), "PRESENTATION_STOPPED", "Finalizó la presentación en vivo");
    }

    public SseEmitter subscribeStream(UserAccount user, long projectId) {
        requireMembership(user, projectId);
        PresentationResponse initial = presentationRepository
                .findByProjectIdAndActiveTrue(projectId)
                .map(this::toResponse)
                .orElse(null);
        return streamHub.subscribe(projectId, initial);
    }

    private List<Long> normalizeFileIds(List<Long> raw) {
        Set<Long> unique = new LinkedHashSet<>();
        for (Long id : raw) {
            if (id != null && id > 0) {
                unique.add(id);
            }
        }
        if (unique.isEmpty()) {
            throw new IllegalArgumentException("Selecciona al menos un archivo");
        }
        return List.copyOf(unique);
    }

    private void validateProjectFiles(long projectId, List<Long> fileIds) {
        Set<Long> allowed = new LinkedHashSet<>();
        for (ProjectItem item : itemRepository.findByProjectIdOrderByAddedAtDesc(projectId)) {
            if (item.getFileId() != null) {
                allowed.add(item.getFileId());
            }
        }
        for (Long fileId : fileIds) {
            if (!allowed.contains(fileId)) {
                throw new IllegalArgumentException("El archivo no pertenece a este proyecto");
            }
            StoredFile file = fileRepository
                    .findById(fileId)
                    .orElseThrow(() -> new IllegalArgumentException("Archivo no encontrado"));
            if (!isPresentable(file)) {
                throw new IllegalArgumentException("Solo se pueden presentar archivos PDF");
            }
        }
    }

    private static boolean isPresentable(StoredFile file) {
        if (file.getContentType() != null && file.getContentType().contains("pdf")) {
            return true;
        }
        String name = file.getOriginalName();
        return name != null && name.toLowerCase().endsWith(".pdf");
    }

    private PresentationResponse toResponse(ProjectPresentation p) {
        String hostName = userRepository
                .findById(p.getHostUserId())
                .map(UserAccount::getUsername)
                .orElse("?");
        return new PresentationResponse(
                p.isActive(),
                p.getHostUserId(),
                hostName,
                readFileIds(p.getFileIdsJson()),
                p.getCurrentFileIndex(),
                p.getStartedAt(),
                p.getUpdatedAt());
    }

    private List<Long> readFileIds(String json) {
        try {
            return objectMapper.readValue(json, FILE_IDS_TYPE);
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String writeFileIds(List<Long> fileIds) {
        try {
            return objectMapper.writeValueAsString(fileIds);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo serializar la lista de archivos");
        }
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
        activityRepository.save(ProjectActivity.of(projectId, actorUserId, type, summary, "PRESENTATION", null));
    }
}
