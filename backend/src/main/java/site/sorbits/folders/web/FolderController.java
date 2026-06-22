package site.sorbits.folders.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.folders.FolderService;
import site.sorbits.folders.dto.CreateFolderRequest;
import site.sorbits.folders.dto.FolderResponse;
import site.sorbits.folders.dto.RenameFolderRequest;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public List<FolderResponse> list(@AuthenticationPrincipal UserAccount user) {
        return folderService.list(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderResponse create(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateFolderRequest req) {
        return folderService.create(user, req);
    }

    @PutMapping("/{id}")
    public FolderResponse rename(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody RenameFolderRequest req) {
        return folderService.rename(user, id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        folderService.delete(user, id);
    }
}
