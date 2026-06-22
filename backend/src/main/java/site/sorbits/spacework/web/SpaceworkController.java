package site.sorbits.spacework.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import site.sorbits.spacework.SpaceworkBoardService;
import site.sorbits.spacework.SpaceworkWikiService;
import site.sorbits.spacework.SpaceworkChatService;
import site.sorbits.spacework.SpaceworkCommentService;
import site.sorbits.spacework.SpaceworkPresentationService;
import site.sorbits.spacework.SpaceworkService;
import site.sorbits.spacework.ProjectInvitationService;
import site.sorbits.spacework.dto.*;
import site.sorbits.spacework.dto.InvitationDtos.CreateInvitationRequest;
import site.sorbits.spacework.dto.InvitationDtos.InvitationResponse;
import site.sorbits.spacework.dto.InvitationDtos.TransferOwnershipRequest;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spacework/projects")
public class SpaceworkController {

    private final SpaceworkService spacework;
    private final SpaceworkChatService chat;
    private final SpaceworkCommentService comments;
    private final SpaceworkPresentationService presentations;
    private final SpaceworkBoardService board;
    private final SpaceworkWikiService wiki;
    private final ProjectInvitationService invitations;

    public SpaceworkController(
            SpaceworkService spacework,
            SpaceworkChatService chat,
            SpaceworkCommentService comments,
            SpaceworkPresentationService presentations,
            SpaceworkBoardService board,
            SpaceworkWikiService wiki,
            ProjectInvitationService invitations) {
        this.spacework = spacework;
        this.chat = chat;
        this.comments = comments;
        this.presentations = presentations;
        this.board = board;
        this.wiki = wiki;
        this.invitations = invitations;
    }

    @GetMapping
    public List<ProjectResponse> list(@AuthenticationPrincipal UserAccount user) {
        return spacework.listProjects(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateProjectRequest req) {
        return spacework.createProject(user, req);
    }

    @GetMapping("/{id}")
    public ProjectResponse get(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return spacework.getProject(user, id);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody UpdateProjectRequest req) {
        return spacework.updateProject(user, id, req);
    }

    @GetMapping("/{id}/members")
    public List<MemberResponse> members(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return spacework.listMembers(user, id);
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse addMember(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody AddMemberRequest req) {
        return spacework.addMember(user, id, req);
    }

    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long userId) {
        spacework.removeMember(user, id, userId);
    }

    @PostMapping("/{id}/transfer-ownership")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void transferOwnership(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody TransferOwnershipRequest req) {
        spacework.transferOwnership(user, id, req.newOwnerId());
    }

    @GetMapping("/{id}/invitations")
    public List<InvitationResponse> listInvitations(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return invitations.listPending(user, id);
    }

    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse createInvitation(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody CreateInvitationRequest req) {
        return invitations.create(user, id, req);
    }

    @DeleteMapping("/{id}/invitations/{invitationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelInvitation(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long invitationId) {
        invitations.cancel(user, id, invitationId);
    }

    @PutMapping("/{id}/members/{userId}/role")
    public MemberResponse updateMemberRole(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long userId,
            @Valid @RequestBody UpdateMemberRoleRequest req) {
        return spacework.updateMemberRole(user, id, userId, req);
    }

    @GetMapping("/{id}/channels")
    public List<ChannelResponse> channels(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return chat.listChannels(user, id);
    }

    @PostMapping("/{id}/channels")
    @ResponseStatus(HttpStatus.CREATED)
    public ChannelResponse createChannel(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody CreateChannelRequest req) {
        return chat.createChannel(user, id, req);
    }

    @GetMapping("/{id}/channels/{channelId}/messages")
    public List<MessageResponse> messages(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long channelId) {
        return chat.listMessages(user, id, channelId);
    }

    @PostMapping("/{id}/channels/{channelId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long channelId,
            @Valid @RequestBody SendMessageRequest req) {
        return chat.sendMessage(user, id, channelId, req);
    }

    @GetMapping(value = "/{id}/channels/{channelId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessages(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long channelId) {
        return chat.subscribeStream(user, id, channelId);
    }

    @GetMapping("/{id}/items")
    public List<ProjectItemResponse> items(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return spacework.listItems(user, id);
    }

    @PostMapping("/{id}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectItemResponse addItem(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody AddProjectItemRequest req) {
        return spacework.addItem(user, id, req);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeItem(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long itemId) {
        spacework.removeItem(user, id, itemId);
    }

    @GetMapping("/{id}/activity")
    public List<ActivityResponse> activity(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return spacework.listActivity(user, id);
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        spacework.archiveProject(user, id);
    }

    @GetMapping("/{id}/files/{fileId}/comments")
    public List<FileCommentResponse> fileComments(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long fileId) {
        return comments.listComments(user, id, fileId);
    }

    @GetMapping(value = "/{id}/files/{fileId}/comments/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamFileComments(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long fileId) {
        return comments.subscribeStream(user, id, fileId);
    }

    @PostMapping("/{id}/files/{fileId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public FileCommentResponse addFileComment(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long fileId,
            @Valid @RequestBody AddFileCommentRequest req) {
        return comments.addComment(user, id, fileId, req);
    }

    @DeleteMapping("/{id}/files/{fileId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFileComment(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long fileId,
            @PathVariable long commentId) {
        comments.deleteComment(user, id, fileId, commentId);
    }

    @GetMapping("/{id}/presentation")
    public PresentationResponse getPresentation(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return presentations.getActive(user, id).orElse(PresentationResponse.inactive());
    }

    @PostMapping("/{id}/presentation")
    @ResponseStatus(HttpStatus.CREATED)
    public PresentationResponse startPresentation(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody StartPresentationRequest req) {
        return presentations.start(user, id, req);
    }

    @PutMapping("/{id}/presentation")
    public PresentationResponse updatePresentation(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody UpdatePresentationStateRequest req) {
        return presentations.updateState(user, id, req);
    }

    @DeleteMapping("/{id}/presentation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void stopPresentation(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        presentations.stop(user, id);
    }

    @GetMapping(value = "/{id}/presentation/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPresentation(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return presentations.subscribeStream(user, id);
    }

    @GetMapping("/{id}/board")
    public BoardResponse board(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return board.getBoard(user, id);
    }

    @GetMapping(value = "/{id}/board/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamBoard(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return board.subscribeStream(user, id);
    }

    @PostMapping("/{id}/board/columns")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardColumnResponse createBoardColumn(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody CreateBoardColumnRequest req) {
        return board.createColumn(user, id, req);
    }

    @PostMapping("/{id}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardTaskResponse createBoardTask(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody CreateBoardTaskRequest req) {
        return board.createTask(user, id, req);
    }

    @PutMapping("/{id}/tasks/{taskId}")
    public BoardTaskResponse updateBoardTask(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long taskId,
            @Valid @RequestBody UpdateBoardTaskRequest req) {
        return board.updateTask(user, id, taskId, req);
    }

    @PostMapping("/{id}/tasks/{taskId}/complete")
    public BoardTaskResponse completeBoardTask(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable long taskId,
            @RequestBody(required = false) CompleteTaskRequest req) {
        if (req != null && Boolean.FALSE.equals(req.completed())) {
            UpdateBoardTaskRequest reopen =
                    new UpdateBoardTaskRequest(null, null, null, null, null, null, null, null, null, null, null, true, null);
            return board.updateTask(user, id, taskId, reopen);
        }
        return board.completeTask(user, id, taskId);
    }

    @DeleteMapping("/{id}/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBoardTask(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable long taskId) {
        board.deleteTask(user, id, taskId);
    }

    @GetMapping("/{id}/wiki/pages")
    public List<WikiPageSummaryResponse> wikiPages(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return wiki.listPages(user, id);
    }

    @GetMapping("/{id}/wiki/pages/{slug}")
    public WikiPageResponse wikiPage(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable String slug) {
        return wiki.getPage(user, id, slug);
    }

    @PostMapping("/{id}/wiki/pages")
    @ResponseStatus(HttpStatus.CREATED)
    public WikiPageResponse createWikiPage(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody CreateWikiPageRequest req) {
        return wiki.createPage(user, id, req);
    }

    @PutMapping("/{id}/wiki/pages/{slug}")
    public WikiPageResponse updateWikiPage(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @PathVariable String slug,
            @Valid @RequestBody UpdateWikiPageRequest req) {
        return wiki.updatePage(user, id, slug, req);
    }

    @DeleteMapping("/{id}/wiki/pages/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWikiPage(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id, @PathVariable String slug) {
        wiki.deletePage(user, id, slug);
    }

    @GetMapping(value = "/{id}/wiki/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamWiki(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return wiki.subscribeStream(user, id);
    }
}
