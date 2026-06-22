package site.sorbits.mail;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;

import java.util.Properties;

@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnProperty(name = "sorbits.mail.enabled", havingValue = "true")
    JavaMailSender javaMailSender(Environment env) {
        String host = env.getProperty("sorbits.mail.host", "");
        if (!StringUtils.hasText(host)) {
            throw new IllegalStateException("sorbits.mail.enabled=true pero falta SORBITS_SMTP_HOST");
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host.trim());
        sender.setPort(env.getProperty("sorbits.mail.port", Integer.class, 587));
        sender.setUsername(env.getProperty("sorbits.mail.username", ""));
        sender.setPassword(env.getProperty("sorbits.mail.password", ""));

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put(
                "mail.smtp.auth",
                env.getProperty("sorbits.mail.smtp-auth", Boolean.class, true).toString());
        props.put(
                "mail.smtp.starttls.enable",
                env.getProperty("sorbits.mail.smtp-starttls", Boolean.class, true).toString());
        return sender;
    }
}
