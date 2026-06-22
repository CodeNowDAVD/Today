package site.sorbits.spacework.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.spacework.ProjectInvitationService;
import site.sorbits.spacework.dto.InvitationDtos.InvitationPreviewResponse;
import site.sorbits.spacework.dto.InvitationDtos.InvitationResponse;
import site.sorbits.user.UserAccount;

@RestController
@RequestMapping("/api/v1/invitations")
public class InvitationPublicController {

    private final ProjectInvitationService invitations;

    public InvitationPublicController(ProjectInvitationService invitations) {
        this.invitations = invitations;
    }

    @GetMapping("/{token}")
    public InvitationPreviewResponse preview(@PathVariable String token) {
        return invitations.preview(token);
    }

    @PostMapping("/{token}/accept")
    public InvitationResponse accept(@AuthenticationPrincipal UserAccount user, @PathVariable String token) {
        return invitations.accept(user, token);
    }

    @PostMapping("/{token}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@AuthenticationPrincipal UserAccount user, @PathVariable String token) {
        invitations.decline(user, token);
    }
}
