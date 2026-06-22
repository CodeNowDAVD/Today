package site.sorbits.user.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.spacework.ProjectInvitationService;
import site.sorbits.spacework.dto.InvitationDtos.InvitationResponse;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/project-invitations")
public class MeProjectInvitationController {

    private final ProjectInvitationService invitations;

    public MeProjectInvitationController(ProjectInvitationService invitations) {
        this.invitations = invitations;
    }

    @GetMapping
    public List<InvitationResponse> list(@AuthenticationPrincipal UserAccount user) {
        return invitations.listForInvitee(user);
    }

    @PostMapping("/{id}/accept")
    public InvitationResponse accept(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return invitations.acceptById(user, id);
    }

    @PostMapping("/{id}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        invitations.declineById(user, id);
    }
}
