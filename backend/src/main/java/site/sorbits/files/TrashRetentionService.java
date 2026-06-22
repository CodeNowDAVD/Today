package site.sorbits.files;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.spacework.SpaceworkService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class TrashRetentionService {

    private static final Logger log = LoggerFactory.getLogger(TrashRetentionService.class);

    private final StoredFileRepository fileRepository;
    private final FileStorageService storage;
    private final OneDriveSyncTrigger oneDriveSync;
    private final SpaceworkService spacework;
    private final int retentionDays;

    public TrashRetentionService(
            StoredFileRepository fileRepository,
            FileStorageService storage,
            OneDriveSyncTrigger oneDriveSync,
            SpaceworkService spacework,
            @Value("${app.storage.trash-retention-days:30}") int retentionDays) {
        this.fileRepository = fileRepository;
        this.storage = storage;
        this.oneDriveSync = oneDriveSync;
        this.spacework = spacework;
        this.retentionDays = retentionDays;
    }

    /** Elimina del disco y BD solo archivos en papelera más antiguos que el plazo. */
    @Scheduled(cron = "${app.storage.purge-cron:0 15 4 * * *}")
    @Transactional
    public void purgeExpiredTrash() {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        var expired = fileRepository.findByDeletedAtBefore(cutoff);
        if (expired.isEmpty()) {
            return;
        }
        log.info("Purgando {} archivo(s) de papelera (antes de {})", expired.size(), cutoff);
        for (StoredFile meta : expired) {
            spacework.onFileMovedToTrash(meta.getId());
            storage.delete(meta.getOwnerId(), meta.getStoredName());
            fileRepository.delete(meta);
        }
        if (!expired.isEmpty()) {
            oneDriveSync.afterStorageChange();
        }
    }
}
