package site.sorbits.security;

public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException() {
        super("Demasiados intentos. Espera un momento e inténtalo de nuevo.");
    }
}
