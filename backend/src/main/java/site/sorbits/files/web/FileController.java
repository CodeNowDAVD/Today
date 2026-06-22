package site.sorbits.files.web;

import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import site.sorbits.files.FileSection;
import site.sorbits.files.FileService;
import jakarta.validation.Valid;
import site.sorbits.files.dto.AssignFolderRequest;
import site.sorbits.files.dto.FileCountsResponse;
import site.sorbits.files.dto.FileListItemResponse;
import site.sorbits.files.dto.PagedFileListResponse;
import site.sorbits.files.dto.RenameFileRequest;
import site.sorbits.user.UserAccount;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping
    public PagedFileListResponse listActive(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(defaultValue = "UTILS") FileSection section,
            @RequestParam(required = false) Long folderId,
            @RequestParam(defaultValue = "false") boolean uncategorized,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size) {
        return fileService.listActive(user, section, folderId, uncategorized, day, q, tags, page, size);
    }

    @GetMapping("/trash")
    public PagedFileListResponse listTrash(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(defaultValue = "UTILS") FileSection section,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) Integer size) {
        return fileService.listTrash(user, section, day, q, page, size);
    }

    @GetMapping("/counts")
    public FileCountsResponse counts(
            @AuthenticationPrincipal UserAccount user, @RequestParam(defaultValue = "UTILS") FileSection section) {
        return fileService.counts(user, section);
    }

    @GetMapping("/days")
    public List<String> daysWithFiles(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam(defaultValue = "UTILS") FileSection section,
            @RequestParam(defaultValue = "false") boolean trash,
            @RequestParam(required = false) Long folderId,
            @RequestParam(defaultValue = "false") boolean uncategorized,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return fileService.daysWithFiles(user, section, trash, folderId, uncategorized, month);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileListItemResponse upload(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "UTILS") FileSection section,
            @RequestParam(required = false) Long folderId)
            throws IOException {
        return fileService.upload(user, file, section, folderId);
    }

    @RequestMapping(value = "/{id}/folder", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public FileListItemResponse assignFolder(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @RequestBody AssignFolderRequest body) {
        return fileService.assignFolder(user, id, body);
    }

    @GetMapping("/{id}/preview/office.pdf")
    public ResponseEntity<Resource> officePreviewPdf(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        var payload = fileService.officePreviewPdf(user, id);
        if (payload.isEmpty()) {
            return ResponseEntity.status(503).build();
        }
        var pdf = payload.get();
        String encoded = URLEncoder.encode(pdf.filename(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encoded)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf.resource());
    }

    @DeleteMapping("/{id}/preview/office.pdf")
    public ResponseEntity<Void> releaseOfficePreviewPdf(
            @AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        fileService.releaseOfficePreviewPdf(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @RequestParam(defaultValue = "false") boolean inline)
            throws IOException {
        var payload = fileService.download(user, id);
        String encoded = URLEncoder.encode(payload.filename(), StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = (inline ? "inline" : "attachment") + "; filename*=UTF-8''" + encoded;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .contentType(MediaType.parseMediaType(payload.contentType()))
                .body(payload.resource());
    }

    @PutMapping(value = "/{id}/content", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileListItemResponse replaceContent(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @RequestParam("file") MultipartFile file)
            throws IOException {
        return fileService.replaceContent(user, id, file);
    }

    @PostMapping("/{id}/rename")
    public FileListItemResponse rename(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody RenameFileRequest body) {
        return fileService.rename(user, id, body);
    }

    @RequestMapping(value = "/{id}/name", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public FileListItemResponse renameLegacy(
            @AuthenticationPrincipal UserAccount user,
            @PathVariable long id,
            @Valid @RequestBody RenameFileRequest body) {
        return fileService.rename(user, id, body);
    }

    @PostMapping("/{id}/copy")
    public FileListItemResponse copy(@AuthenticationPrincipal UserAccount user, @PathVariable long id)
            throws IOException {
        return fileService.copy(user, id);
    }

    @PostMapping("/{id}/restore")
    public FileListItemResponse restore(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        return fileService.restoreFromTrash(user, id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> moveToTrash(@AuthenticationPrincipal UserAccount user, @PathVariable long id) {
        fileService.moveToTrash(user, id);
        return ResponseEntity.noContent().build();
    }
}
