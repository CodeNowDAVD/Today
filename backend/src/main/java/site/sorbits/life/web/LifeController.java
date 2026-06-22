package site.sorbits.life.web;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.life.LifeService;
import site.sorbits.life.dto.LifeDtos.*;
import site.sorbits.spacework.dto.BoardTaskResponse;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/life")
public class LifeController {

    private final LifeService life;

    public LifeController(LifeService life) {
        this.life = life;
    }

    @GetMapping("/workspaces")
    public List<LifeWorkspaceResponse> listWorkspaces(@AuthenticationPrincipal UserAccount user) {
        return life.listPersonalWorkspaces(user);
    }

    @PostMapping("/workspaces")
    public LifeWorkspaceResponse createWorkspace(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateLifeWorkspaceRequest req) {
        return life.createPersonalWorkspace(user, req);
    }

    @DeleteMapping("/workspaces/{id}")
    public void archiveWorkspace(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        life.archivePersonalWorkspace(user, id);
    }

    @PostMapping("/workspaces/{id}/promote")
    public PromoteWorkspaceResponse promoteWorkspace(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return life.promoteToTeam(user, id);
    }

    @GetMapping("/today")
    public TodayResponse today(@AuthenticationPrincipal UserAccount user) {
        return life.getToday(user);
    }

    @GetMapping("/tasks")
    public List<LifeTaskSummary> tasks(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) Long workspaceId) {
        return life.listTasks(user, filter, tag, workspaceId);
    }

    @PostMapping("/tasks/{workspaceId}/{taskId}/complete")
    public BoardTaskResponse completeTask(
            @AuthenticationPrincipal UserAccount user, @PathVariable long workspaceId, @PathVariable long taskId) {
        return life.completeTask(user, workspaceId, taskId);
    }

    @GetMapping("/inbox")
    public List<InboxItemResponse> inbox(@AuthenticationPrincipal UserAccount user) {
        return life.listInbox(user);
    }

    @GetMapping("/inbox/count")
    public long inboxCount(@AuthenticationPrincipal UserAccount user) {
        return life.inboxPendingCount(user);
    }

    @PostMapping("/inbox")
    public InboxItemResponse capture(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateInboxRequest req) {
        return life.capture(user, req);
    }

    @PatchMapping("/inbox/{id}")
    public InboxItemResponse patchInbox(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @RequestBody PatchInboxRequest req) {
        return life.patchInbox(user, id, req);
    }

    @DeleteMapping("/inbox/{id}")
    public void deleteInbox(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        life.deleteInbox(user, id);
    }

    @GetMapping("/contacts")
    public List<ContactResponse> contacts(@AuthenticationPrincipal UserAccount user) {
        return life.listContacts(user);
    }

    @PostMapping("/contacts")
    public ContactResponse createContact(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateContactRequest req) {
        return life.createContact(user, req);
    }

    @PatchMapping("/contacts/{id}")
    public ContactResponse updateContact(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @RequestBody UpdateContactRequest req) {
        return life.updateContact(user, id, req);
    }

    @DeleteMapping("/contacts/{id}")
    public void deleteContact(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        life.deleteContact(user, id);
    }

    @GetMapping("/contacts/{id}/linked")
    public ContactLinkedResponse contactLinked(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return life.getContactLinked(user, id);
    }

    @GetMapping("/tasks/{taskId}/contacts")
    public List<ContactResponse> taskContacts(
            @AuthenticationPrincipal UserAccount user, @PathVariable long taskId) {
        return life.listTaskContacts(user, taskId);
    }

    @PutMapping("/tasks/{taskId}/contacts")
    public List<ContactResponse> setTaskContacts(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long taskId,
            @RequestBody(required = false) SetTaskContactsRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Cuerpo requerido");
        }
        return life.setTaskContacts(user, taskId, req.contactIds());
    }

    @PostMapping("/contacts/{id}/tasks/{taskId}")
    public void linkTask(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long taskId) {
        life.linkContactToTask(user, id, taskId);
    }

    @DeleteMapping("/contacts/{id}/tasks/{taskId}")
    public void unlinkTask(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long taskId) {
        life.unlinkContactFromTask(user, id, taskId);
    }

    @PostMapping("/contacts/{id}/files/{fileId}")
    public void linkFile(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long fileId) {
        life.linkContactToFile(user, id, fileId);
    }

    @GetMapping("/files/{fileId}/contacts")
    public List<ContactResponse> fileContacts(
            @AuthenticationPrincipal UserAccount user, @PathVariable long fileId) {
        return life.listFileContacts(user, fileId);
    }

    @PutMapping("/files/{fileId}/contacts")
    public List<ContactResponse> setFileContacts(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long fileId,
            @RequestBody(required = false) SetTaskContactsRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Cuerpo requerido");
        }
        return life.setFileContacts(user, fileId, req.contactIds());
    }

    @DeleteMapping("/contacts/{id}/files/{fileId}")
    public void unlinkFile(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long fileId) {
        life.unlinkContactFromFile(user, id, fileId);
    }

    @GetMapping("/tags/suggest")
    public List<String> suggestTags(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(required = false, defaultValue = "") String prefix) {
        return life.suggestTags(user, prefix);
    }
}
