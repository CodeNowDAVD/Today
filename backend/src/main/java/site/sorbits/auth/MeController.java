package site.sorbits.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import site.sorbits.user.UserAccount;

@RestController
@RequestMapping("/api/v1/auth")
public class MeController {

    public record MeResponse(long id, String username, String role) {}

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        UserAccount user = (UserAccount) authentication.getPrincipal();
        return ResponseEntity.ok(new MeResponse(user.getId(), user.getUsername(), user.getRole().name()));
    }
}
