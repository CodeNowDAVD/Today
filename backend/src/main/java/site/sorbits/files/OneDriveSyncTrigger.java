package site.sorbits.files;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Component
public class OneDriveSyncTrigger {

    private static final Logger log = LoggerFactory.getLogger(OneDriveSyncTrigger.class);

    private final boolean enabled;
    private final String scriptPath;
    private final long debounceSeconds;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "onedrive-sync-scheduler");
        t.setDaemon(true);
        return t;
    });
    private ScheduledFuture<?> pending;

    public OneDriveSyncTrigger(
            @Value("${app.storage.onedrive-sync-enabled:false}") boolean enabled,
            @Value("${app.storage.onedrive-sync-script:}") String scriptPath,
            @Value("${app.storage.onedrive-sync-debounce-seconds:8}") long debounceSeconds) {
        this.enabled = enabled;
        this.scriptPath = scriptPath == null ? "" : scriptPath.trim();
        this.debounceSeconds = Math.max(2, debounceSeconds);
    }

    /** Programa un sync (agrupa varios cambios seguidos; sin cron). */
    public synchronized void afterStorageChange() {
        if (!enabled || scriptPath.isEmpty()) {
            return;
        }
        if (pending != null) {
            pending.cancel(false);
        }
        pending = scheduler.schedule(this::runSync, debounceSeconds, TimeUnit.SECONDS);
    }

    private void runSync() {
        try {
            ProcessBuilder pb = new ProcessBuilder("/data/data/com.termux/files/usr/bin/bash", scriptPath);
            pb.redirectErrorStream(true);
            var env = pb.environment();
            copyEnv(env, "SORBITS_UPLOAD_DIR");
            copyEnv(env, "SORBITS_ONEDRIVE_REMOTE");
            copyEnv(env, "HOME");
            Process process = pb.start();
            boolean finished = process.waitFor(15, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Sync OneDrive superó 15 min, proceso terminado");
            } else if (process.exitValue() != 0) {
                log.warn("Sync OneDrive terminó con código {}", process.exitValue());
            } else {
                log.debug("Sync OneDrive OK");
            }
        } catch (Exception e) {
            log.warn("No se pudo lanzar sync OneDrive: {}", e.getMessage());
        }
    }

    private static void copyEnv(java.util.Map<String, String> target, String key) {
        String v = System.getenv(key);
        if (v != null && !v.isBlank()) {
            target.put(key, v);
        }
    }
}
