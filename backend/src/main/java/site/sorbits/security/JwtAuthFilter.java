package site.sorbits.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import site.sorbits.apitoken.ApiTokenService;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserAccountRepository users;
    private final ApiTokenService apiTokens;

    public JwtAuthFilter(JwtService jwtService, UserAccountRepository users, ApiTokenService apiTokens) {
        this.jwtService = jwtService;
        this.users = users;
        this.apiTokens = apiTokens;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (!authenticateJwt(token) && !authenticateApiToken(token)) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    private boolean authenticateJwt(String token) {
        if (token.startsWith("sor_")) {
            return false;
        }
        try {
            Claims claims = jwtService.parse(token);
            return users.findByUsername(claims.getSubject())
                    .filter(UserAccount::isActive)
                    .map(this::setAuth)
                    .orElse(false);
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean authenticateApiToken(String token) {
        return apiTokens.authenticate(token).map(this::setAuth).orElse(false);
    }

    private boolean setAuth(UserAccount user) {
        var auth = new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
        return true;
    }
}
