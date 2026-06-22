package site.sorbits.files;

import jakarta.annotation.PostConstruct;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
public class OfficePreviewService {

    private static final Set<String> OFFICE_EXTENSIONS = Set.of(
            "doc", "docx",
            "xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm",
            "ods", "fods");
    private static final long CONVERT_TIMEOUT_SECONDS = 120;
    /** Conversiones LibreOffice simultáneas: el teléfono tiene poca RAM/CPU. */
    private static final int MAX_CONCURRENT_CONVERSIONS = 1;
    private static final long CONVERT_SLOT_WAIT_SECONDS = 90;

    private final OfficePreviewProperties properties;
    private final FileStorageService storage;
    private final Path cacheRoot;
    private final java.util.concurrent.Semaphore convertSlots =
            new java.util.concurrent.Semaphore(MAX_CONCURRENT_CONVERSIONS, true);
    private volatile Boolean sofficeAvailable;

    public OfficePreviewService(OfficePreviewProperties properties, FileStorageService storage) throws IOException {
        this.properties = properties;
        this.storage = storage;
        this.cacheRoot = Path.of(properties.cacheDir()).toAbsolutePath().normalize();
        Files.createDirectories(cacheRoot);
    }

    @PostConstruct
    void init() {
        purgeStaleCache();
    }

    public boolean isEnabled() {
        return properties.previewEnabled();
    }

    public boolean isOfficePreviewFile(String originalName) {
        if (originalName == null || !originalName.contains(".")) {
            return false;
        }
        String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return OFFICE_EXTENSIONS.contains(ext);
    }

    public Optional<Path> resolveCachedPdf(long fileId, String storedName, long sizeBytes) {
        if (!properties.previewEnabled() || !isSofficeAvailable()) {
            return Optional.empty();
        }
        Path cached = cachePath(fileId, storedName, sizeBytes);
        return Files.isRegularFile(cached) ? Optional.of(cached) : Optional.empty();
    }

    public Optional<Path> convertToPdf(
            long fileId, long ownerId, String originalName, String storedName, long sizeBytes) {
        if (!properties.previewEnabled() || !isOfficePreviewFile(originalName)) {
            return Optional.empty();
        }
        if (!storage.exists(ownerId, storedName)) {
            return Optional.empty();
        }
        if (!isSofficeAvailable()) {
            return Optional.empty();
        }

        Path cached = cachePath(fileId, storedName, sizeBytes);
        if (Files.isRegularFile(cached)) {
            return Optional.of(cached);
        }

        boolean acquired;
        try {
            acquired = convertSlots.tryAcquire(CONVERT_SLOT_WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
        if (!acquired) {
            // Servidor ocupado: el cliente cae a la vista de cuadrícula (no saturamos).
            return Optional.empty();
        }

        // Otra petición pudo generar el PDF mientras esperábamos el turno.
        if (Files.isRegularFile(cached)) {
            convertSlots.release();
            return Optional.of(cached);
        }

        Path source = storage.resolvePath(ownerId, storedName);
        Path workDir = cacheRoot.resolve("work-" + fileId + "-" + System.nanoTime());
        try {
            Files.createDirectories(workDir);
            ProcessBuilder pb = new ProcessBuilder(
                    properties.sofficePath(),
                    "--headless",
                    "--nologo",
                    "--nofirststartwizard",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    workDir.toString(),
                    source.toString());
            pb.redirectErrorStream(true);
            Process process = pb.start();
            boolean finished = process.waitFor(CONVERT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return Optional.empty();
            }
            if (process.exitValue() != 0) {
                return Optional.empty();
            }

            Path produced = workDir.resolve(stripExtension(source.getFileName().toString()) + ".pdf");
            if (!Files.isRegularFile(produced)) {
                try (var stream = Files.list(workDir)) {
                    produced = stream
                            .filter(p -> p.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".pdf"))
                            .findFirst()
                            .orElse(null);
                }
            }
            if (produced == null || !Files.isRegularFile(produced)) {
                return Optional.empty();
            }

            Files.createDirectories(cached.getParent());
            Files.move(produced, cached, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return Optional.of(cached);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (IOException ex) {
            return Optional.empty();
        } finally {
            convertSlots.release();
            deleteRecursively(workDir);
        }
    }

    public void releasePreviewPdf(long fileId, String storedName, long sizeBytes) {
        try {
            Files.deleteIfExists(cachePath(fileId, storedName, sizeBytes));
        } catch (IOException ignored) {
            /* best effort */
        }
    }

    @Scheduled(cron = "0 25 4 * * *")
    void scheduledPurge() {
        purgeStaleCache();
    }

    void purgeStaleCache() {
        if (!Files.isDirectory(cacheRoot)) {
            return;
        }
        Instant cutoff = Instant.now().minus(properties.cacheMaxAgeHours(), ChronoUnit.HOURS);
        try (var entries = Files.list(cacheRoot)) {
            entries.forEach(path -> {
                try {
                    if (Files.isDirectory(path) && path.getFileName().toString().startsWith("work-")) {
                        deleteRecursively(path);
                        return;
                    }
                    if (!Files.isRegularFile(path) || !path.getFileName().toString().endsWith(".pdf")) {
                        return;
                    }
                    FileTime modified = Files.getLastModifiedTime(path);
                    if (modified.toInstant().isBefore(cutoff)) {
                        Files.deleteIfExists(path);
                    }
                } catch (IOException ignored) {
                    /* best effort */
                }
            });
        } catch (IOException ignored) {
            /* best effort */
        }
    }

    private Path cachePath(long fileId, String storedName, long sizeBytes) {
        String key = fileId + "-" + Math.abs(storedName.hashCode()) + "-" + sizeBytes + ".pdf";
        return cacheRoot.resolve(key);
    }

    private boolean isSofficeAvailable() {
        Boolean cached = sofficeAvailable;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (sofficeAvailable != null) {
                return sofficeAvailable;
            }
            try {
                ProcessBuilder pb = new ProcessBuilder(properties.sofficePath(), "--version");
                pb.redirectErrorStream(true);
                Process process = pb.start();
                boolean finished = process.waitFor(8, TimeUnit.SECONDS);
                sofficeAvailable = finished && process.exitValue() == 0;
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                sofficeAvailable = false;
            } catch (IOException ex) {
                sofficeAvailable = false;
            }
            return sofficeAvailable;
        }
    }

    private static String stripExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static void deleteRecursively(Path root) {
        if (root == null || !Files.exists(root)) {
            return;
        }
        try (var walk = Files.walk(root)) {
            walk.sorted(java.util.Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    /* best effort */
                }
            });
        } catch (IOException ignored) {
            /* best effort */
        }
    }
}
