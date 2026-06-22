package site.sorbits.files;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import site.sorbits.files.dto.AssignFolderRequest;
import site.sorbits.files.dto.FileCountsResponse;
import site.sorbits.files.dto.FileListItemResponse;
import site.sorbits.files.dto.PagedFileListResponse;
import site.sorbits.files.dto.RenameFileRequest;
import site.sorbits.folders.FolderService;
import site.sorbits.spacework.SpaceworkService;
import site.sorbits.tags.TagService;
import site.sorbits.tags.dto.FileTagItemResponse;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FileService {

    private final StoredFileRepository fileRepository;
    private final UserAccountRepository userRepository;
    private final FileStorageService storage;
    private final OneDriveSyncTrigger oneDriveSync;
    private final FolderService folderService;
    private final TagService tagService;
    private final OfficePreviewService officePreview;
    private final SpaceworkService spacework;
    private final int trashRetentionDays;
    private final ZoneId zoneId;
    private final int defaultPageSize;
    private final int maxPageSize;

    public FileService(
            StoredFileRepository fileRepository,
            UserAccountRepository userRepository,
            FileStorageService storage,
            OneDriveSyncTrigger oneDriveSync,
            FolderService folderService,
            TagService tagService,
            OfficePreviewService officePreview,
            SpaceworkService spacework,
            @Value("${app.storage.trash-retention-days:30}") int trashRetentionDays,
            @Value("${app.timezone:America/Mexico_City}") String timezone,
            @Value("${app.files.page-size:30}") int defaultPageSize,
            @Value("${app.files.page-size-max:100}") int maxPageSize) {
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
        this.storage = storage;
        this.oneDriveSync = oneDriveSync;
        this.folderService = folderService;
        this.tagService = tagService;
        this.officePreview = officePreview;
        this.spacework = spacework;
        this.trashRetentionDays = trashRetentionDays;
        this.zoneId = ZoneId.of(timezone);
        this.defaultPageSize = defaultPageSize;
        this.maxPageSize = maxPageSize;
    }

    private void notifyStorageChanged() {
        oneDriveSync.afterStorageChange();
    }

    @Transactional(readOnly = true)
    public PagedFileListResponse listActive(
            UserAccount viewer,
            FileSection section,
            Long folderId,
            boolean uncategorized,
            LocalDate day,
            String q,
            List<Long> tagIds,
            int page,
            Integer size) {
        if (folderId != null) {
            folderService.validateOwned(viewer, folderId);
        }
        Instant[] range = dayRange(day);
        Long ownerId = ownerFilter(viewer);
        Specification<StoredFile> spec = FileSpecs.active(
                ownerId, section, folderId, uncategorized, range[0], range[1], q);
        if (tagIds != null && !tagIds.isEmpty()) {
            if (folderId == null) {
                throw new IllegalArgumentException("El filtro por etiqueta requiere una carpeta abierta");
            }
            List<Long> fileIds = tagService.fileIdsMatchingAnyTag(viewer, folderId, tagIds);
            if (fileIds.isEmpty()) {
                return new PagedFileListResponse(List.of(), page, pageSize(size), 0, 0, false);
            }
            spec = spec.and((root, query, cb) -> root.get("id").in(fileIds));
        }
        Pageable pageable = PageRequest.of(page, pageSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        return toPaged(fileRepository.findAll(spec, pageable));
    }

    @Transactional(readOnly = true)
    public PagedFileListResponse listTrash(
            UserAccount viewer, FileSection section, LocalDate day, String q, int page, Integer size) {
        Instant[] range = dayRange(day);
        Long ownerId = ownerFilter(viewer);
        Specification<StoredFile> spec = FileSpecs.trashed(ownerId, section, range[0], range[1], q);
        Pageable pageable = PageRequest.of(page, pageSize(size), Sort.by(Sort.Direction.DESC, "deletedAt"));
        return toPaged(fileRepository.findAll(spec, pageable));
    }

    @Transactional(readOnly = true)
    public FileCountsResponse counts(UserAccount viewer, FileSection section) {
        Long ownerId = ownerFilter(viewer);
        long active = fileRepository.count(FileSpecs.active(ownerId, section, null, false, null, null, null));
        long trash = fileRepository.count(FileSpecs.trashed(ownerId, section, null, null, null));
        return new FileCountsResponse(active, trash);
    }

    @Transactional(readOnly = true)
    public List<String> daysWithFiles(
            UserAccount viewer,
            FileSection section,
            boolean trash,
            Long folderId,
            boolean uncategorized,
            YearMonth month) {
        Long ownerId = ownerFilter(viewer);
        if (folderId != null) {
            folderService.validateOwned(viewer, folderId);
        }
        Instant from = month.atDay(1).atStartOfDay(zoneId).toInstant();
        Instant to = month.plusMonths(1).atDay(1).atStartOfDay(zoneId).toInstant();
        Set<LocalDate> days = new LinkedHashSet<>();
        if (trash) {
            for (Instant t : fileRepository.findTrashDeletedAtInRange(section, ownerId, from, to)) {
                if (t != null) days.add(t.atZone(zoneId).toLocalDate());
            }
        } else {
            for (Instant t : fileRepository.findActiveCreatedAtInRange(
                    section, ownerId, folderId, uncategorized, from, to)) {
                if (t != null) days.add(t.atZone(zoneId).toLocalDate());
            }
        }
        return days.stream().sorted().map(LocalDate::toString).toList();
    }

    /** ADMIN ve archivos de todos los usuarios; USER solo los propios. */
    private Long ownerFilter(UserAccount viewer) {
        return viewer.getRole() == Role.ADMIN ? null : viewer.getId();
    }

    private Instant[] dayRange(LocalDate day) {
        if (day == null) {
            return new Instant[] {null, null};
        }
        Instant from = day.atStartOfDay(zoneId).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(zoneId).toInstant();
        return new Instant[] {from, to};
    }

    private int pageSize(Integer size) {
        if (size == null || size < 1) {
            return defaultPageSize;
        }
        return Math.min(size, maxPageSize);
    }

    private PagedFileListResponse toPaged(Page<StoredFile> page) {
        return new PagedFileListResponse(
                mapList(page.getContent()),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext());
    }

    @Transactional
    public FileListItemResponse upload(UserAccount owner, MultipartFile file, FileSection section, Long folderId)
            throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío");
        }
        folderService.validateOwned(owner, folderId);
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "sin-nombre";
        String storedName = FileStorageService.newStoredName(original);
        storage.store(owner.getId(), storedName, file.getInputStream());
        StoredFile entity = StoredFile.create(
                owner.getId(),
                original,
                storedName,
                file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE,
                file.getSize(),
                section,
                folderId);
        var saved = toResponse(fileRepository.save(entity), owner.getUsername(), List.of());
        notifyStorageChanged();
        return saved;
    }

    @Transactional
    public FileListItemResponse assignFolder(UserAccount user, long fileId, AssignFolderRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Cuerpo requerido");
        }
        StoredFile meta = requireFile(fileId);
        if (!canAccess(user, meta)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        if (meta.isTrashed()) {
            throw new IllegalArgumentException("No se puede mover un archivo en papelera");
        }
        Long folderId = req.folderId();
        if (!user.getId().equals(meta.getOwnerId())) {
            throw new FileAccessDeniedException("Solo el dueño puede cambiar la carpeta");
        }
        folderService.validateOwned(user, folderId);
        meta.setFolderId(folderId);
        var persisted = fileRepository.save(meta);
        if (folderId != null) {
            tagService.pruneFileTagsForFolder(persisted.getId(), folderId, user);
        } else {
            tagService.clearFileTags(persisted.getId());
        }
        String ownerName = userRepository
                .findById(persisted.getOwnerId())
                .map(UserAccount::getUsername)
                .orElse("?");
        var saved = toResponse(
                persisted,
                ownerName,
                tagService.tagsByFileIds(List.of(persisted.getId())).getOrDefault(persisted.getId(), List.of()));
        notifyStorageChanged();
        return saved;
    }

    public record DownloadPayload(Resource resource, String filename, String contentType) {}

    @Transactional(readOnly = true)
    public Optional<DownloadPayload> officePreviewPdf(UserAccount user, long fileId) {
        StoredFile meta = requireFile(fileId);
        if (!canAccess(user, meta)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        if (!officePreview.isOfficePreviewFile(meta.getOriginalName())) {
            return Optional.empty();
        }
        if (!storage.exists(meta.getOwnerId(), meta.getStoredName())) {
            throw new FileNotFoundException("Archivo no encontrado en almacén");
        }

        var pdfPath = officePreview
                .resolveCachedPdf(fileId, meta.getStoredName(), meta.getSizeBytes())
                .or(() -> officePreview.convertToPdf(
                        fileId,
                        meta.getOwnerId(),
                        meta.getOriginalName(),
                        meta.getStoredName(),
                        meta.getSizeBytes()));
        if (pdfPath.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(new DownloadPayload(
                new FileSystemResource(pdfPath.get()),
                officePdfName(meta.getOriginalName()),
                MediaType.APPLICATION_PDF_VALUE));
    }

    @Transactional(readOnly = true)
    public void releaseOfficePreviewPdf(UserAccount user, long fileId) {
        StoredFile meta = requireFile(fileId);
        if (!canAccess(user, meta)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        officePreview.releasePreviewPdf(fileId, meta.getStoredName(), meta.getSizeBytes());
    }

    @Transactional(readOnly = true)
    public DownloadPayload download(UserAccount user, long fileId) throws IOException {
        StoredFile meta = requireFile(fileId);
        if (!canAccess(user, meta)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        if (!storage.exists(meta.getOwnerId(), meta.getStoredName())) {
            throw new FileNotFoundException("Archivo no encontrado en almacén");
        }
        var path = storage.resolvePath(meta.getOwnerId(), meta.getStoredName());
        return new DownloadPayload(
                new FileSystemResource(path),
                meta.getOriginalName(),
                meta.getContentType() != null ? meta.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE);
    }

    @Transactional
    public void moveToTrash(UserAccount user, long fileId) {
        StoredFile meta = requireFile(fileId);
        if (!user.getId().equals(meta.getOwnerId()) && user.getRole() != Role.ADMIN) {
            throw new FileAccessDeniedException("Solo el dueño puede mover a papelera");
        }
        if (meta.isTrashed()) {
            return;
        }
        meta.moveToTrash();
        fileRepository.save(meta);
        spacework.onFileMovedToTrash(fileId);
        notifyStorageChanged();
    }

    @Transactional
    public FileListItemResponse rename(UserAccount user, long fileId, RenameFileRequest req) {
        StoredFile meta = requireFile(fileId);
        if (!user.getId().equals(meta.getOwnerId())) {
            throw new FileAccessDeniedException("Solo el dueño puede renombrar");
        }
        if (meta.isTrashed()) {
            throw new IllegalArgumentException("No se puede renombrar un archivo en papelera");
        }
        meta.rename(req.name());
        return saveAndMap(user, fileRepository.save(meta));
    }

    @Transactional
    public FileListItemResponse replaceContent(UserAccount user, long fileId, MultipartFile file)
            throws IOException {
        StoredFile meta = requireFile(fileId);
        if (!user.getId().equals(meta.getOwnerId())) {
            throw new FileAccessDeniedException("Solo el dueño puede editar");
        }
        if (meta.isTrashed()) {
            throw new IllegalArgumentException("No se puede editar un archivo en papelera");
        }
        if (!isEditableImage(meta.getContentType(), meta.getOriginalName())) {
            throw new IllegalArgumentException("Solo se pueden editar imágenes raster");
        }
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío");
        }
        String contentType = file.getContentType() != null ? file.getContentType() : "";
        if (!contentType.toLowerCase().startsWith("image/")) {
            throw new IllegalArgumentException("El contenido debe ser una imagen");
        }
        if (!storage.exists(meta.getOwnerId(), meta.getStoredName())) {
            throw new FileNotFoundException("Archivo no encontrado en almacén");
        }
        storage.store(meta.getOwnerId(), meta.getStoredName(), file.getInputStream());
        meta.updateContent(contentType, file.getSize());
        return saveAndMap(user, fileRepository.save(meta));
    }

    private static boolean isEditableImage(String contentType, String originalName) {
        if (contentType != null) {
            String ct = contentType.toLowerCase();
            if (ct.contains("svg")) {
                return false;
            }
            if (ct.startsWith("image/")) {
                return true;
            }
        }
        int dot = originalName.lastIndexOf('.');
        if (dot < 0 || dot >= originalName.length() - 1) {
            return false;
        }
        String ext = originalName.substring(dot + 1).toLowerCase();
        return Set.of("png", "jpg", "jpeg", "gif", "webp", "bmp").contains(ext);
    }

    @Transactional
    public FileListItemResponse copy(UserAccount user, long fileId) throws IOException {
        StoredFile meta = requireFile(fileId);
        if (!user.getId().equals(meta.getOwnerId())) {
            throw new FileAccessDeniedException("Solo el dueño puede copiar");
        }
        if (meta.isTrashed()) {
            throw new IllegalArgumentException("No se puede copiar un archivo en papelera");
        }
        if (!storage.exists(meta.getOwnerId(), meta.getStoredName())) {
            throw new FileNotFoundException("Archivo no encontrado en almacén");
        }
        String copyName = copyDisplayName(meta.getOriginalName());
        String storedName = FileStorageService.newStoredName(copyName);
        storage.duplicate(meta.getOwnerId(), meta.getStoredName(), storedName);
        StoredFile copy = StoredFile.create(
                meta.getOwnerId(),
                copyName,
                storedName,
                meta.getContentType(),
                meta.getSizeBytes(),
                meta.getSection(),
                meta.getFolderId());
        return saveAndMap(user, fileRepository.save(copy));
    }

    private static String officePdfName(String original) {
        int dot = original.lastIndexOf('.');
        if (dot > 0) {
            return original.substring(0, dot) + ".pdf";
        }
        return original + ".pdf";
    }

    private static String copyDisplayName(String original) {
        int dot = original.lastIndexOf('.');
        if (dot > 0) {
            return original.substring(0, dot) + " (copia)" + original.substring(dot);
        }
        return original + " (copia)";
    }

    private FileListItemResponse saveAndMap(UserAccount user, StoredFile persisted) {
        String ownerName = userRepository
                .findById(persisted.getOwnerId())
                .map(UserAccount::getUsername)
                .orElse("?");
        var saved = toResponse(
                persisted,
                ownerName,
                tagService.tagsByFileIds(List.of(persisted.getId())).getOrDefault(persisted.getId(), List.of()));
        notifyStorageChanged();
        return saved;
    }

    @Transactional
    public FileListItemResponse restoreFromTrash(UserAccount user, long fileId) {
        StoredFile meta = requireFile(fileId);
        if (!canAccess(user, meta)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        if (!meta.isTrashed()) {
            throw new IllegalArgumentException("El archivo no está en papelera");
        }
        meta.restoreFromTrash();
        String ownerName = userRepository
                .findById(meta.getOwnerId())
                .map(UserAccount::getUsername)
                .orElse("?");
        var saved = toResponse(
                fileRepository.save(meta),
                ownerName,
                tagService.tagsByFileIds(List.of(meta.getId())).getOrDefault(meta.getId(), List.of()));
        notifyStorageChanged();
        return saved;
    }

    private StoredFile requireFile(long fileId) {
        return fileRepository.findById(fileId).orElseThrow(() -> new FileNotFoundException("Archivo no encontrado"));
    }

    private boolean canAccess(UserAccount user, StoredFile meta) {
        if (user.getRole() == Role.ADMIN || user.getId().equals(meta.getOwnerId())) {
            return true;
        }
        if (meta.isTrashed()) {
            return false;
        }
        return spacework.canViewFileViaProject(user, meta.getId());
    }

    private List<FileListItemResponse> mapList(List<StoredFile> files) {
        if (files.isEmpty()) {
            return List.of();
        }
        Set<Long> ownerIds = files.stream().map(StoredFile::getOwnerId).collect(Collectors.toSet());
        Map<Long, String> names = userRepository.findAllById(ownerIds).stream()
                .collect(Collectors.toMap(UserAccount::getId, UserAccount::getUsername));
        List<Long> fileIds = files.stream().map(StoredFile::getId).toList();
        Map<Long, List<FileTagItemResponse>> tagsMap = tagService.tagsByFileIds(fileIds);
        return files.stream()
                .map(f -> toResponse(f, names.getOrDefault(f.getOwnerId(), "?"), tagsMap.getOrDefault(f.getId(), List.of())))
                .toList();
    }

    private FileListItemResponse toResponse(StoredFile f, String ownerName, List<FileTagItemResponse> tags) {
        Long daysLeft = null;
        if (f.getDeletedAt() != null) {
            Instant purgeAt = f.getDeletedAt().plus(trashRetentionDays, ChronoUnit.DAYS);
            daysLeft = Math.max(0, ChronoUnit.DAYS.between(Instant.now(), purgeAt));
        }
        return new FileListItemResponse(
                f.getId(),
                f.getOriginalName(),
                f.getContentType(),
                f.getSizeBytes(),
                f.getSection(),
                f.getCreatedAt(),
                ownerName,
                f.getDeletedAt(),
                daysLeft,
                f.getFolderId(),
                tags);
    }
}
