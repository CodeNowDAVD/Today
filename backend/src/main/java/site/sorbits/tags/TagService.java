package site.sorbits.tags;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.files.FileAccessDeniedException;
import site.sorbits.files.FileNotFoundException;
import site.sorbits.files.StoredFile;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.folders.FolderService;
import site.sorbits.folders.dto.FolderResponse;
import site.sorbits.links.LinkNotFoundException;
import site.sorbits.links.SavedLink;
import site.sorbits.links.SavedLinkRepository;
import site.sorbits.tags.dto.*;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TagService {

    static final String[] DEFAULT_COLORS = {
        "#5B8DEF", "#47B881", "#F0AB00", "#9B7EDE", "#E86C6C", "#6BC5C8", "#C48F00", "#8B9DAF"
    };

    private final FolderTagRepository tagRepository;
    private final FileTagLinkRepository fileTagRepository;
    private final LinkTagLinkRepository linkTagRepository;
    private final StoredFileRepository fileRepository;
    private final SavedLinkRepository savedLinkRepository;
    private final FolderService folderService;

    public TagService(
            FolderTagRepository tagRepository,
            FileTagLinkRepository fileTagRepository,
            LinkTagLinkRepository linkTagRepository,
            StoredFileRepository fileRepository,
            SavedLinkRepository savedLinkRepository,
            FolderService folderService) {
        this.tagRepository = tagRepository;
        this.fileTagRepository = fileTagRepository;
        this.linkTagRepository = linkTagRepository;
        this.fileRepository = fileRepository;
        this.savedLinkRepository = savedLinkRepository;
        this.folderService = folderService;
    }

    @Transactional(readOnly = true)
    public List<TagResponse> listForFolder(UserAccount user, long folderId) {
        folderService.requireOwned(user, folderId);
        return tagRepository.findByOwnerIdAndFolderIdOrderByNameAsc(user.getId(), folderId).stream()
                .map(this::toTagResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TagResponse> listAllForUser(UserAccount user) {
        List<Long> folderIds = folderService.list(user).stream().map(FolderResponse::id).toList();
        if (folderIds.isEmpty()) {
            return List.of();
        }
        return tagRepository
                .findByOwnerIdAndFolderIdInOrderByFolderIdAscNameAsc(user.getId(), folderIds)
                .stream()
                .map(this::toTagResponse)
                .toList();
    }

    @Transactional
    public TagResponse create(UserAccount user, long folderId, CreateTagRequest req) {
        folderService.requireOwned(user, folderId);
        String name = req.name().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Nombre vacío");
        }
        if (tagRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCase(user.getId(), folderId, name)) {
            throw new IllegalArgumentException("Ya existe una etiqueta con ese nombre");
        }
        String color = resolveColor(req.color(), user.getId(), folderId);
        var saved = tagRepository.save(FolderTag.create(user.getId(), folderId, name, color));
        return toTagResponse(saved);
    }

    @Transactional
    public TagResponse update(UserAccount user, long tagId, UpdateTagRequest req) {
        FolderTag tag = requireOwnedTag(user, tagId);
        if (req.name() != null && !req.name().isBlank()) {
            String name = req.name().trim();
            if (tagRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndIdNot(
                    user.getId(), tag.getFolderId(), name, tagId)) {
                throw new IllegalArgumentException("Ya existe una etiqueta con ese nombre");
            }
            tag.rename(name);
        }
        if (req.color() != null && !req.color().isBlank()) {
            tag.setColor(normalizeColor(req.color()));
        }
        return toTagResponse(tagRepository.save(tag));
    }

    @Transactional
    public void delete(UserAccount user, long tagId) {
        FolderTag tag = requireOwnedTag(user, tagId);
        fileTagRepository.deleteByTagId(tagId);
        linkTagRepository.deleteByTagId(tagId);
        tagRepository.delete(tag);
    }

    @Transactional
    public List<FileTagItemResponse> setFileTags(UserAccount user, long fileId, SetFileTagsRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Cuerpo requerido");
        }
        StoredFile file = fileRepository
                .findById(fileId)
                .orElseThrow(() -> new FileNotFoundException("Archivo no encontrado"));
        if (!canAccessFile(user, file)) {
            throw new FileAccessDeniedException("Sin permiso");
        }
        if (file.isTrashed()) {
            throw new IllegalArgumentException("No se pueden etiquetar archivos eliminados");
        }
        Long folderId = file.getFolderId();
        if (folderId == null) {
            throw new IllegalArgumentException("Asigna el archivo a una carpeta antes de etiquetar");
        }
        folderService.requireOwned(user, folderId);

        List<Long> tagIds = req.tagIds() != null ? req.tagIds() : List.of();
        Set<Long> unique = new LinkedHashSet<>(tagIds);
        for (Long tagId : unique) {
            FolderTag tag = requireOwnedTag(user, tagId);
            if (!tag.getFolderId().equals(folderId)) {
                throw new IllegalArgumentException("La etiqueta no pertenece a la carpeta del archivo");
            }
        }

        fileTagRepository.deleteByFileId(fileId);
        for (Long tagId : unique) {
            fileTagRepository.save(FileTagLink.of(fileId, tagId));
        }
        return getTagsForFile(fileId);
    }

    @Transactional
    public List<FileTagItemResponse> setLinkTags(UserAccount user, long linkId, SetFileTagsRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Cuerpo requerido");
        }
        SavedLink link = savedLinkRepository
                .findByIdAndOwnerId(linkId, user.getId())
                .orElseThrow(() -> new LinkNotFoundException("Enlace no encontrado"));
        Long folderId = link.getFolderId();
        if (folderId != null) {
            folderService.requireOwned(user, folderId);
        }

        List<Long> tagIds = req.tagIds() != null ? req.tagIds() : List.of();
        Set<Long> unique = new LinkedHashSet<>(tagIds);
        for (Long tagId : unique) {
            FolderTag tag = requireOwnedTag(user, tagId);
            if (folderId != null && !tag.getFolderId().equals(folderId)) {
                throw new IllegalArgumentException("La etiqueta no pertenece a la carpeta del enlace");
            }
        }

        linkTagRepository.deleteByLinkId(linkId);
        for (Long tagId : unique) {
            linkTagRepository.save(LinkTagLink.of(linkId, tagId));
        }
        return getTagsForLink(linkId);
    }

    @Transactional
    public void clearLinkTags(long linkId) {
        linkTagRepository.deleteByLinkId(linkId);
    }

    @Transactional
    public void pruneLinkTagsForFolder(long linkId, long folderId, UserAccount user) {
        folderService.requireOwned(user, folderId);
        List<LinkTagLink> links = linkTagRepository.findByLinkIdIn(List.of(linkId));
        if (links.isEmpty()) {
            return;
        }
        Set<Long> tagIds = links.stream().map(LinkTagLink::getTagId).collect(Collectors.toSet());
        Map<Long, FolderTag> tagsById = tagRepository.findAllById(tagIds).stream()
                .collect(Collectors.toMap(FolderTag::getId, t -> t));
        for (LinkTagLink link : links) {
            FolderTag tag = tagsById.get(link.getTagId());
            if (tag == null || !tag.getFolderId().equals(folderId)) {
                linkTagRepository.delete(link);
            }
        }
    }

    @Transactional
    public void clearFileTags(long fileId) {
        fileTagRepository.deleteByFileId(fileId);
    }

    @Transactional
    public void pruneFileTagsForFolder(long fileId, long folderId, UserAccount user) {
        folderService.requireOwned(user, folderId);
        List<FileTagLink> links = fileTagRepository.findByFileId(fileId);
        if (links.isEmpty()) {
            return;
        }
        Set<Long> tagIds = links.stream().map(FileTagLink::getTagId).collect(Collectors.toSet());
        Map<Long, FolderTag> tagsById = tagRepository.findAllById(tagIds).stream()
                .collect(Collectors.toMap(FolderTag::getId, t -> t));
        for (FileTagLink link : links) {
            FolderTag tag = tagsById.get(link.getTagId());
            if (tag == null || !tag.getFolderId().equals(folderId)) {
                fileTagRepository.delete(link);
            }
        }
    }

    @Transactional(readOnly = true)
    public Map<Long, List<FileTagItemResponse>> tagsByFileIds(Collection<Long> fileIds) {
        if (fileIds.isEmpty()) {
            return Map.of();
        }
        List<FileTagLink> links = fileTagRepository.findByFileIdIn(fileIds);
        return tagsMapFromFileLinks(links);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<FileTagItemResponse>> tagsByLinkIds(Collection<Long> linkIds) {
        if (linkIds.isEmpty()) {
            return Map.of();
        }
        List<LinkTagLink> links = linkTagRepository.findByLinkIdIn(linkIds);
        if (links.isEmpty()) {
            return Map.of();
        }
        Set<Long> tagIds =
                links.stream().map(LinkTagLink::getTagId).collect(Collectors.toSet());
        Map<Long, FolderTag> tagsById = tagRepository.findAllById(tagIds).stream()
                .collect(Collectors.toMap(FolderTag::getId, t -> t));
        Map<Long, List<FileTagItemResponse>> result = new HashMap<>();
        for (LinkTagLink link : links) {
            FolderTag tag = tagsById.get(link.getTagId());
            if (tag == null) continue;
            result.computeIfAbsent(link.getLinkId(), k -> new ArrayList<>())
                    .add(new FileTagItemResponse(tag.getId(), tag.getName(), tag.getColor()));
        }
        for (List<FileTagItemResponse> list : result.values()) {
            list.sort(Comparator.comparing(FileTagItemResponse::name));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<FileTagItemResponse> getTagsForLink(long linkId) {
        return tagsByLinkIds(List.of(linkId)).getOrDefault(linkId, List.of());
    }

    private Map<Long, List<FileTagItemResponse>> tagsMapFromFileLinks(List<FileTagLink> links) {
        if (links.isEmpty()) {
            return Map.of();
        }
        Set<Long> tagIds =
                links.stream().map(FileTagLink::getTagId).collect(Collectors.toSet());
        Map<Long, FolderTag> tagsById = tagRepository.findAllById(tagIds).stream()
                .collect(Collectors.toMap(FolderTag::getId, t -> t));
        Map<Long, List<FileTagItemResponse>> result = new HashMap<>();
        for (FileTagLink link : links) {
            FolderTag tag = tagsById.get(link.getTagId());
            if (tag == null) continue;
            result.computeIfAbsent(link.getFileId(), k -> new ArrayList<>())
                    .add(new FileTagItemResponse(tag.getId(), tag.getName(), tag.getColor()));
        }
        for (List<FileTagItemResponse> list : result.values()) {
            list.sort(Comparator.comparing(FileTagItemResponse::name));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<Long> fileIdsMatchingAnyTag(UserAccount user, long folderId, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return List.of();
        }
        folderService.requireOwned(user, folderId);
        for (Long tagId : tagIds) {
            requireOwnedTag(user, tagId);
        }
        return fileTagRepository.findFileIdsWithAnyTag(tagIds);
    }

    @Transactional(readOnly = true)
    public List<Long> linkIdsMatchingAnyTag(UserAccount user, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return List.of();
        }
        for (Long tagId : tagIds) {
            requireOwnedTag(user, tagId);
        }
        return linkTagRepository.findLinkIdsWithAnyTag(tagIds);
    }

    private List<FileTagItemResponse> getTagsForFile(long fileId) {
        return tagsByFileIds(List.of(fileId)).getOrDefault(fileId, List.of());
    }

    private FolderTag requireOwnedTag(UserAccount user, long tagId) {
        return tagRepository
                .findByIdAndOwnerId(tagId, user.getId())
                .orElseThrow(() -> new TagNotFoundException("Etiqueta no encontrada"));
    }

    private boolean canAccessFile(UserAccount user, StoredFile file) {
        return user.getRole() == Role.ADMIN || user.getId().equals(file.getOwnerId());
    }

    private String resolveColor(String requested, Long ownerId, Long folderId) {
        if (requested != null && !requested.isBlank()) {
            return normalizeColor(requested);
        }
        long count = tagRepository.countByOwnerIdAndFolderId(ownerId, folderId);
        return DEFAULT_COLORS[(int) (count % DEFAULT_COLORS.length)];
    }

    private String normalizeColor(String color) {
        String c = color.trim();
        if (!c.startsWith("#")) {
            c = "#" + c;
        }
        if (!c.matches("^#[0-9A-Fa-f]{6}$")) {
            throw new IllegalArgumentException("Color inválido (usa formato #RRGGBB)");
        }
        return c.toUpperCase(Locale.ROOT);
    }

    private TagResponse toTagResponse(FolderTag tag) {
        return new TagResponse(tag.getId(), tag.getFolderId(), tag.getName(), tag.getColor());
    }
}
