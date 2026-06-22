package site.sorbits.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import site.sorbits.user.Role;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

/**
 * Usuario demo para desarrollo local (solo perfil dev).
 * Login: demo / demo
 */
@Configuration
@Profile("dev")
public class DevSeedConfig {

    @Bean
    CommandLineRunner seedDemoUser(UserAccountRepository users, PasswordEncoder encoder) {
        return args -> {
            if (users.findByUsername("demo").isEmpty()) {
                users.save(UserAccount.create("demo", encoder.encode("demo"), Role.USER));
            }
        };
    }
}
