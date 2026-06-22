package site.sorbits.apitoken.web;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import site.sorbits.apitoken.ApiTokenService;
import site.sorbits.apitoken.dto.ApiTokenResponse;
import site.sorbits.apitoken.dto.CreateApiTokenRequest;
import site.sorbits.apitoken.dto.CreateApiTokenResponse;
import site.sorbits.user.UserAccount;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me/api-tokens")
public class ApiTokenController {

    private final ApiTokenService tokens;

    public ApiTokenController(ApiTokenService tokens) {
        this.tokens = tokens;
    }

    @GetMapping
    public List<ApiTokenResponse> list(@AuthenticationPrincipal UserAccount user) {
        return tokens.listForUser(user);
    }

    @PostMapping
    public CreateApiTokenResponse create(
            @AuthenticationPrincipal UserAccount user, @Valid @RequestBody CreateApiTokenRequest req) {
        return tokens.create(user, req.name());
    }

    @DeleteMapping("/{id}")
    public void revoke(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        tokens.revoke(user, id);
    }
}
