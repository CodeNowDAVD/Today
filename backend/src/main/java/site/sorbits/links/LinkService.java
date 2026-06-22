package site.sorbits.links;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.folders.FolderService;
import site.sorbits.folders.dto.AssignFolderRequest;
import site.sorbits.links.dto.CreateLinkRequest;
import site.sorbits.links.dto.LinkResponse;
import site.sorbits.links.dto.UpdateLinkRequest;
import site.sorbits.tags.TagService;
import site.sorbits.tags.dto.FileTagItemResponse;
import site.sorbits.user.UserAccount;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LinkService {

    private final SavedLinkRepository linkRepository;
    private final FolderService folderService;
    private final TagService tagService;

    public LinkService(SavedLinkRepository linkRepository, FolderService folderService, TagService tagService) {
        this.linkRepository = linkRepository;
        this.folderService = folderService;
        this.tagService = tagService;
    }

    @Transactional(readOnly = true)
    public List<LinkResponse> list(
            UserAccount user,
            Long folderId,
            Boolean uncategorized,
            List<Long> tagIds,
            String q) {
        List<SavedLink> rows = loadRows(user, folderId, uncategorized, q);
        rows = filterByTags(user, rows, tagIds);
        return toResponses(rows);
    }

    @Transactional
    public LinkResponse create(UserAccount user, CreateLinkRequest req) {
        String title = req.title().trim();
        String url = normalizeUrl(req.url());
        Long folderId = req.folderId();
        folderService.validateOwned(user, folderId);
        var saved = linkRepository.save(SavedLink.create(user.getId(), folderId, title, url));
        return toResponse(saved, List.of());
    }

    @Transactional
    public LinkResponse update(UserAccount user, long id, UpdateLinkRequest req) {
        SavedLink link = requireOwned(user, id);
        link.update(req.title().trim(), normalizeUrl(req.url()));
        folderService.validateOwned(user, req.folderId());
        link.setFolderId(req.folderId());
        return toResponse(linkRepository.save(link), tagService.getTagsForLink(link.getId()));
    }

    @Transactional
    public LinkResponse assignFolder(UserAccount user, long id, AssignFolderRequest req) {
        SavedLink link = requireOwned(user, id);
        folderService.validateOwned(user, req.folderId());
        link.setFolderId(req.folderId());
        var saved = linkRepository.save(link);
        if (req.folderId() != null) {
            tagService.pruneLinkTagsForFolder(saved.getId(), req.folderId(), user);
        }
        return toResponse(saved, tagService.getTagsForLink(saved.getId()));
    }

    @Transactional
    public void delete(UserAccount user, long id) {
        SavedLink link = requireOwned(user, id);
        tagService.clearLinkTags(link.getId());
        linkRepository.delete(link);
    }

    @Transactional(readOnly = true)
    public SavedLink requireOwned(UserAccount user, long id) {
        return linkRepository
                .findByIdAndOwnerId(id, user.getId())
                .orElseThrow(() -> new LinkNotFoundException("Enlace no encontrado"));
    }

    private List<SavedLink> loadRows(UserAccount user, Long folderId, Boolean uncategorized, String q) {
        Long ownerId = user.getId();
        boolean hasQ = q != null && !q.isBlank();
        if (Boolean.TRUE.equals(uncategorized)) {
            return hasQ
                    ? linkRepository.searchUncategorized(ownerId, q.trim())
                    : linkRepository.findByOwnerIdAndFolderIdIsNullOrderByCreatedAtDesc(ownerId);
        }
        if (folderId != null) {
            folderService.requireOwned(user, folderId);
            return hasQ
                    ? linkRepository.searchInFolder(ownerId, folderId, q.trim())
                    : linkRepository.findByOwnerIdAndFolderIdOrderByCreatedAtDesc(ownerId, folderId);
        }
        return hasQ ? linkRepository.searchAll(ownerId, q.trim()) : linkRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
    }

    private List<SavedLink> filterByTags(UserAccount user, List<SavedLink> rows, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return rows;
        }
        Set<Long> allowed = new HashSet<>(tagService.linkIdsMatchingAnyTag(user, tagIds));
        return rows.stream().filter(l -> allowed.contains(l.getId())).toList();
    }

    private List<LinkResponse> toResponses(List<SavedLink> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream().map(SavedLink::getId).toList();
        Map<Long, List<FileTagItemResponse>> tagsByLink = tagService.tagsByLinkIds(ids);
        return rows.stream()
                .map(l -> toResponse(l, tagsByLink.getOrDefault(l.getId(), List.of())))
                .toList();
    }

    private LinkResponse toResponse(SavedLink link, List<FileTagItemResponse> tags) {
        return new LinkResponse(
                link.getId(), link.getTitle(), link.getUrl(), link.getFolderId(), link.getCreatedAt(), tags);
    }

    static String normalizeUrl(String raw) {
        String url = raw.trim();
        if (!url.contains("://")) {
            url = "https://" + url;
        }
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("URL no válida");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("La URL debe usar http o https");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new IllegalArgumentException("URL no válida");
        }
        return url;
    }
}
