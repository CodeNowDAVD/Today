package site.sorbits.spacework;

public class WikiPageNotFoundException extends RuntimeException {

    public WikiPageNotFoundException(String message) {
        super(message);
    }
}
