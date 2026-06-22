package site.sorbits.files;

/** Fallo al leer o escribir en la bóveda (archivo ausente, permisos, etc.). */
public class StorageAccessException extends RuntimeException {

    public StorageAccessException(String message) {
        super(message);
    }

    public StorageAccessException(String message, Throwable cause) {
        super(message, cause);
    }
}
