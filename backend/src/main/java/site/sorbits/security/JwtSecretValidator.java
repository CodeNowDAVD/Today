package site.sorbits.security;

import jakarta.annotation.PostConstruct;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class JwtSecretValidator {

    private static final int MIN_SECRET_LENGTH = 32;
    private static final String DEV_MARKER = "dev-only";

    private final Environment environment;

    public JwtSecretValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        if (Arrays.asList(environment.getActiveProfiles()).contains("dev")) {
            return;
        }
        String secret = environment.getProperty("app.security.jwt-secret", "");
        if (secret.length() < MIN_SECRET_LENGTH || secret.contains(DEV_MARKER)) {
            throw new IllegalStateException(
                    "JWT_SECRET debe definirse con al menos 32 caracteres aleatorios en entornos no-dev");
        }
    }
}
