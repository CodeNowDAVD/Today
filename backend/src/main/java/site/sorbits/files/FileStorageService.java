package site.sorbits.files;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadRoot;

    public FileStorageService(@Value("${app.storage.upload-dir}") String uploadDir) throws IOException {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadRoot);
    }

    public Path resolvePath(long ownerId, String storedName) {
        validateStoredName(storedName);
        Path ownerRoot = uploadRoot.resolve(String.valueOf(ownerId)).normalize();
        Path resolved = ownerRoot.resolve(storedName).normalize();
        if (!resolved.startsWith(ownerRoot)) {
            throw new StorageAccessException("Ruta fuera de la bóveda");
        }
        return resolved;
    }

    public void store(long ownerId, String storedName, InputStream input) {
        Path target = resolvePath(ownerId, storedName);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new StorageAccessException("No se pudo guardar el archivo", ex);
        }
    }

    public boolean exists(long ownerId, String storedName) {
        return Files.isRegularFile(resolvePath(ownerId, storedName));
    }

    public void delete(long ownerId, String storedName) {
        try {
            Files.deleteIfExists(resolvePath(ownerId, storedName));
        } catch (IOException ex) {
            throw new StorageAccessException("No se pudo eliminar el archivo", ex);
        }
    }

    public void duplicate(long ownerId, String sourceStored, String destStored) {
        Path source = resolvePath(ownerId, sourceStored);
        Path dest = resolvePath(ownerId, destStored);
        try {
            if (!Files.isRegularFile(source)) {
                throw new StorageAccessException("Archivo origen no encontrado");
            }
            Files.createDirectories(dest.getParent());
            Files.copy(source, dest, StandardCopyOption.COPY_ATTRIBUTES);
        } catch (IOException ex) {
            throw new StorageAccessException("No se pudo copiar el archivo", ex);
        }
    }

    private static void validateStoredName(String storedName) {
        if (storedName == null || storedName.isBlank()) {
            throw new StorageAccessException("Nombre de almacenamiento inválido");
        }
        if (storedName.contains("..") || storedName.contains("/") || storedName.contains("\\")) {
            throw new StorageAccessException("Nombre de almacenamiento inválido");
        }
    }

    public static String newStoredName(String originalFilename) {
        String ext = "";
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot > 0 && dot < originalFilename.length() - 1) {
                ext = originalFilename.substring(dot);
            }
        }
        return UUID.randomUUID() + ext;
    }
}
