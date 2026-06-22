package site.sorbits;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import site.sorbits.files.OfficePreviewProperties;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({OfficePreviewProperties.class})
public class TodayApplication {
    public static void main(String[] args) {
        SpringApplication.run(TodayApplication.class, args);
    }
}
