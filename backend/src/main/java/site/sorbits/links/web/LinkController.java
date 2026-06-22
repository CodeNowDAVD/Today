package site.sorbits.links.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.folders.dto.AssignFolderRequest;
import site.sorbits.links.LinkService;
import site.sorbits.links.dto.CreateLinkRequest;
import site.sorbits.links.dto.LinkResponse;
import site.sorbits.links.dto.UpdateLinkRequest;
import site.sorbits.user.UserAccount;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/links")
public class LinkController {

    private final LinkService linkService;

    public LinkController(LinkService linkService) {
        this.linkService = linkService;
    }

    @GetMapping
    public List<LinkResponse> list(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) Boolean uncategorized,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String q) {
        List<Long> tagIds = parseTagIds(tags);
        return linkService.list(user, folderId, uncategorized, tagIds, q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LinkResponse create(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateLinkRequest req) {
        return linkService.create(user, req);
    }

    @PutMapping("/{id}")
    public LinkResponse update(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody UpdateLinkRequest req) {
        return linkService.update(user, id, req);
    }

    @RequestMapping(value = "/{id}/folder", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public LinkResponse assignFolder(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @RequestBody AssignFolderRequest body) {
        return linkService.assignFolder(user, id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        linkService.delete(user, id);
    }

    private static List<Long> parseTagIds(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .toList();
    }
}
