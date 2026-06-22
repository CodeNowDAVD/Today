package site.sorbits.files;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.office")
public record OfficePreviewProperties(
        boolean previewEnabled,
        String sofficePath,
        String cacheDir,
        int cacheMaxAgeHours) {

    public OfficePreviewProperties {
        if (sofficePath == null || sofficePath.isBlank()) {
            sofficePath = "libreoffice";
        }
        if (cacheMaxAgeHours <= 0) {
            cacheMaxAgeHours = 24;
        }
    }
}
