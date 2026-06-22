package site.sorbits.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import site.sorbits.security.AuthRateLimiter;
import site.sorbits.security.JwtService;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserAccountRepository users;
    private final RegistrationService registration;
    private final AuthRateLimiter rateLimiter;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserAccountRepository users,
            RegistrationService registration,
            AuthRateLimiter rateLimiter) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.users = users;
        this.registration = registration;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        rateLimiter.checkLogin(clientIp(http), request.username());
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        UserAccount user = users.findByUsername(request.username()).orElseThrow();
        String token = jwtService.createToken(user);
        return ResponseEntity.ok(new LoginResponse(token, "Bearer", user.getUsername(), user.getRole()));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
        rateLimiter.checkRegister(clientIp(http));
        return ResponseEntity.ok(registration.register(request));
    }

    private static String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded;
        }
        return http.getRemoteAddr();
    }
}
