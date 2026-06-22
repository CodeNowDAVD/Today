package site.sorbits.files;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class FileSpecs {

    private FileSpecs() {}

    public static Specification<StoredFile> active(
            Long ownerId,
            FileSection section,
            Long folderId,
            boolean uncategorizedOnly,
            Instant fromInclusive,
            Instant toExclusive,
            String nameQuery) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("section"), section));
            preds.add(cb.isNull(root.get("deletedAt")));
            if (ownerId != null) {
                preds.add(cb.equal(root.get("ownerId"), ownerId));
            }
            if (uncategorizedOnly) {
                preds.add(cb.isNull(root.get("folderId")));
            } else if (folderId != null) {
                preds.add(cb.equal(root.get("folderId"), folderId));
            }
            if (fromInclusive != null) {
                preds.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromInclusive));
            }
            if (toExclusive != null) {
                preds.add(cb.lessThan(root.get("createdAt"), toExclusive));
            }
            if (nameQuery != null && !nameQuery.isBlank()) {
                preds.add(cb.like(cb.lower(root.get("originalName")), "%" + nameQuery.toLowerCase() + "%"));
            }
            return cb.and(preds.toArray(Predicate[]::new));
        };
    }

    public static Specification<StoredFile> trashed(
            Long ownerId,
            FileSection section,
            Instant fromInclusive,
            Instant toExclusive,
            String nameQuery) {
        return (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("section"), section));
            preds.add(cb.isNotNull(root.get("deletedAt")));
            if (ownerId != null) {
                preds.add(cb.equal(root.get("ownerId"), ownerId));
            }
            if (fromInclusive != null) {
                preds.add(cb.greaterThanOrEqualTo(root.get("deletedAt"), fromInclusive));
            }
            if (toExclusive != null) {
                preds.add(cb.lessThan(root.get("deletedAt"), toExclusive));
            }
            if (nameQuery != null && !nameQuery.isBlank()) {
                preds.add(cb.like(cb.lower(root.get("originalName")), "%" + nameQuery.toLowerCase() + "%"));
            }
            return cb.and(preds.toArray(Predicate[]::new));
        };
    }
}
