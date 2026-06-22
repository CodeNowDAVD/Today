package site.sorbits.auth;

import site.sorbits.user.Role;

public record LoginResponse(String accessToken, String tokenType, String username, Role role) {}
