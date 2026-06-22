package site.sorbits.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.security.JwtService;
import site.sorbits.spacework.ProjectInvitationService;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

@Service
public class RegistrationService {

    private final UserAccountRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ProjectInvitationService invitations;
    private final boolean inviteOnly;

    public RegistrationService(
            UserAccountRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            ProjectInvitationService invitations,
            @Value("${sorbits.registration.invite-only:true}") boolean inviteOnly) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.invitations = invitations;
        this.inviteOnly = inviteOnly;
    }

    @Transactional
    public LoginResponse register(RegisterRequest req) {
        String username = req.username().trim();
        String email = req.email().trim().toLowerCase();
        String inviteToken = req.inviteToken() == null ? null : req.inviteToken().trim();

        if (inviteOnly && (inviteToken == null || inviteToken.isBlank())) {
            throw new IllegalArgumentException("Se requiere una invitación válida para registrarse");
        }

        if (users.existsByUsername(username)) {
            throw new IllegalArgumentException("Ese nombre de usuario ya existe");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Ese email ya está registrado");
        }

        if (inviteToken != null && !inviteToken.isBlank()) {
            invitations.validateEmailForRegistration(inviteToken, email);
        }

        UserAccount saved = users.save(UserAccount.createWithEmail(
                username, email, passwordEncoder.encode(req.password()), Role.USER));

        if (inviteToken != null && !inviteToken.isBlank()) {
            invitations.acceptAfterRegistration(saved, inviteToken);
        }

        return new LoginResponse(
                jwtService.createToken(saved), "Bearer", saved.getUsername(), saved.getRole());
    }
}
