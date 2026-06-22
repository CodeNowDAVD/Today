package site.sorbits.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Límite en memoria por clave (IP / usuario). Suficiente para instancia única (Termux).
 */
@Component
public class AuthRateLimiter {

    private static final class Bucket {
        volatile long windowStartMs = System.currentTimeMillis();
        final AtomicInteger count = new AtomicInteger(0);
    }

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int loginPerIp;
    private final int loginPerUser;
    private final int registerPerIp;
    private final Duration loginWindow;
    private final Duration registerWindow;

    public AuthRateLimiter(
            @Value("${app.security.auth-rate-limit.login-per-ip:40}") int loginPerIp,
            @Value("${app.security.auth-rate-limit.login-per-user:12}") int loginPerUser,
            @Value("${app.security.auth-rate-limit.register-per-ip:15}") int registerPerIp,
            @Value("${app.security.auth-rate-limit.login-window-minutes:15}") int loginWindowMinutes,
            @Value("${app.security.auth-rate-limit.register-window-minutes:60}") int registerWindowMinutes) {
        this.loginPerIp = loginPerIp;
        this.loginPerUser = loginPerUser;
        this.registerPerIp = registerPerIp;
        this.loginWindow = Duration.ofMinutes(Math.max(1, loginWindowMinutes));
        this.registerWindow = Duration.ofMinutes(Math.max(1, registerWindowMinutes));
    }

    public void checkLogin(String clientIp, String username) {
        check("login-ip:" + normalizeIp(clientIp), loginPerIp, loginWindow);
        if (username != null && !username.isBlank()) {
            check("login-user:" + username.trim().toLowerCase(), loginPerUser, loginWindow);
        }
    }

    public void checkRegister(String clientIp) {
        check("register-ip:" + normalizeIp(clientIp), registerPerIp, registerWindow);
    }

    private void check(String key, int maxAttempts, Duration window) {
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket());
        synchronized (bucket) {
            long now = System.currentTimeMillis();
            if (now - bucket.windowStartMs > window.toMillis()) {
                bucket.windowStartMs = now;
                bucket.count.set(0);
            }
            if (bucket.count.incrementAndGet() > maxAttempts) {
                throw new RateLimitExceededException();
            }
        }
    }

    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        int comma = ip.indexOf(',');
        return (comma >= 0 ? ip.substring(0, comma) : ip).trim();
    }
}
