package site.sorbits.tags.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.tags.TagService;
import site.sorbits.tags.dto.*;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping("/tags")
    public List<TagResponse> listAll(@AuthenticationPrincipal UserAccount user) {
        return tagService.listAllForUser(user);
    }

    @GetMapping("/folders/{folderId}/tags")
    public List<TagResponse> list(@AuthenticationPrincipal UserAccount user, @PathVariable long folderId) {
        return tagService.listForFolder(user, folderId);
    }

    @PostMapping("/folders/{folderId}/tags")
    @ResponseStatus(HttpStatus.CREATED)
    public TagResponse create(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long folderId,
            @Valid @RequestBody CreateTagRequest req) {
        return tagService.create(user, folderId, req);
    }

    @PutMapping("/tags/{id}")
    public TagResponse update(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody UpdateTagRequest req) {
        return tagService.update(user, id, req);
    }

    @DeleteMapping("/tags/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        tagService.delete(user, id);
    }

    @PutMapping("/files/{fileId}/tags")
    public List<FileTagItemResponse> setFileTags(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long fileId,
            @RequestBody SetFileTagsRequest req) {
        return tagService.setFileTags(user, fileId, req);
    }

    @PutMapping("/links/{linkId}/tags")
    public List<FileTagItemResponse> setLinkTags(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long linkId,
            @RequestBody SetFileTagsRequest req) {
        return tagService.setLinkTags(user, linkId, req);
    }
}
