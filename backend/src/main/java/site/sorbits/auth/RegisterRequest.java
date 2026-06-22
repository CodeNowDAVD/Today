package site.sorbits.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 80) String username,
        @NotBlank @Size(min = 6, max = 128) String password,
        @Email @Size(max = 255) String email,
        String inviteToken) {}
