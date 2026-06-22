package site.sorbits.folders;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import site.sorbits.files.FileSection;
import site.sorbits.files.StoredFileRepository;
import site.sorbits.links.SavedLinkRepository;
import site.sorbits.folders.dto.CreateFolderRequest;
import site.sorbits.folders.dto.FolderResponse;
import site.sorbits.folders.dto.RenameFolderRequest;
import site.sorbits.user.UserAccount;

import java.util.List;

@Service
public class FolderService {

    private final UserFolderRepository folderRepository;
    private final StoredFileRepository fileRepository;
    private final SavedLinkRepository linkRepository;

    public FolderService(
            UserFolderRepository folderRepository,
            StoredFileRepository fileRepository,
            SavedLinkRepository linkRepository) {
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
        this.linkRepository = linkRepository;
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> list(UserAccount user) {
        return folderRepository.findByOwnerIdOrderByNameAsc(user.getId()).stream()
                .map(f -> new FolderResponse(
                        f.getId(),
                        f.getName(),
                        f.getCreatedAt(),
                        fileRepository.countByOwnerIdAndFolderIdAndSectionAndDeletedAtIsNull(
                                user.getId(), f.getId(), FileSection.UTILS)))
                .toList();
    }

    @Transactional
    public FolderResponse create(UserAccount user, CreateFolderRequest req) {
        String name = req.name().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Nombre vacío");
        }
        if (folderRepository.existsByOwnerIdAndNameIgnoreCase(user.getId(), name)) {
            throw new IllegalArgumentException("Ya existe una carpeta con ese nombre");
        }
        var saved = folderRepository.save(UserFolder.create(user.getId(), name));
        return new FolderResponse(saved.getId(), saved.getName(), saved.getCreatedAt(), 0);
    }

    @Transactional
    public FolderResponse rename(UserAccount user, long folderId, RenameFolderRequest req) {
        UserFolder folder = requireOwned(user, folderId);
        String name = req.name().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Nombre vacío");
        }
        if (!folder.getName().equalsIgnoreCase(name)
                && folderRepository.existsByOwnerIdAndNameIgnoreCase(user.getId(), name)) {
            throw new IllegalArgumentException("Ya existe una carpeta con ese nombre");
        }
        folder.rename(name);
        var saved = folderRepository.save(folder);
        long count = fileRepository.countByOwnerIdAndFolderIdAndSectionAndDeletedAtIsNull(
                user.getId(), saved.getId(), FileSection.UTILS);
        return new FolderResponse(saved.getId(), saved.getName(), saved.getCreatedAt(), count);
    }

    @Transactional
    public void delete(UserAccount user, long folderId) {
        requireOwned(user, folderId);
        fileRepository.clearFolderId(folderId);
        linkRepository.clearFolderId(folderId);
        folderRepository.deleteById(folderId);
    }

    @Transactional(readOnly = true)
    public UserFolder requireOwned(UserAccount user, long folderId) {
        return folderRepository
                .findByIdAndOwnerId(folderId, user.getId())
                .orElseThrow(() -> new FolderNotFoundException("Carpeta no encontrada"));
    }

    public void validateOwned(UserAccount user, Long folderId) {
        if (folderId == null) {
            return;
        }
        requireOwned(user, folderId);
    }
}
