package site.sorbits.apitoken;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.apitoken.dto.ApiTokenResponse;
import site.sorbits.apitoken.dto.CreateApiTokenResponse;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class ApiTokenService {

    private static final String PREFIX = "sor_";
    private static final int MAX_ACTIVE_TOKENS = 10;
    private static final Duration LAST_USED_THROTTLE = Duration.ofMinutes(5);

    private final ApiTokenRepository tokenRepository;
    private final UserAccountRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public ApiTokenService(ApiTokenRepository tokenRepository, UserAccountRepository userRepository) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ApiTokenResponse> listForUser(UserAccount user) {
        return tokenRepository.findByUserIdAndRevokedAtIsNullOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CreateApiTokenResponse create(UserAccount user, String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Nombre vacío");
        }
        long active = tokenRepository.findByUserIdAndRevokedAtIsNullOrderByCreatedAtDesc(user.getId()).size();
        if (active >= MAX_ACTIVE_TOKENS) {
            throw new IllegalArgumentException("Máximo " + MAX_ACTIVE_TOKENS + " tokens activos");
        }
        String raw = generateRawToken();
        String hash = hashToken(raw);
        String tokenPrefix = raw.substring(0, Math.min(12, raw.length()));
        ApiToken saved = tokenRepository.save(ApiToken.create(user.getId(), name, hash, tokenPrefix));
        return new CreateApiTokenResponse(
                saved.getId(), saved.getName(), raw, saved.getTokenPrefix(), saved.getCreatedAt());
    }

    @Transactional
    public void revoke(UserAccount user, long tokenId) {
        ApiToken token = tokenRepository
                .findByIdAndUserIdAndRevokedAtIsNull(tokenId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Token no encontrado"));
        token.revoke();
        tokenRepository.save(token);
    }

    @Transactional
    public Optional<UserAccount> authenticate(String rawToken) {
        if (rawToken == null || !rawToken.startsWith(PREFIX)) {
            return Optional.empty();
        }
        return tokenRepository
                .findByTokenHashAndRevokedAtIsNull(hashToken(rawToken))
                .flatMap(token -> userRepository.findById(token.getUserId()).filter(UserAccount::isActive).map(user -> {
                    touchLastUsed(token);
                    return user;
                }));
    }

    private void touchLastUsed(ApiToken token) {
        Instant now = Instant.now();
        Instant last = token.getLastUsedAt();
        if (last != null && Duration.between(last, now).compareTo(LAST_USED_THROTTLE) < 0) {
            return;
        }
        token.touchUsed(now);
        tokenRepository.updateLastUsedAt(token.getId(), now);
    }

    static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private ApiTokenResponse toResponse(ApiToken token) {
        return new ApiTokenResponse(
                token.getId(),
                token.getName(),
                token.getTokenPrefix(),
                token.getCreatedAt(),
                token.getLastUsedAt());
    }
}
