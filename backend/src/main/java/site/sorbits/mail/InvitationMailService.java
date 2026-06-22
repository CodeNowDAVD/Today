package site.sorbits.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class InvitationMailService {

    private static final Logger log = LoggerFactory.getLogger(InvitationMailService.class);

    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String fromAddress;

    public InvitationMailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${sorbits.mail.enabled:false}") boolean enabled,
            @Value("${sorbits.mail.from:noreply@sorbits.site}") String fromAddress) {
        this.mailSender = mailSender;
        this.enabled = enabled;
        this.fromAddress = fromAddress;
    }

    public void sendProjectInvitation(
            String toEmail, String inviterName, String projectName, String inviteUrl) {
        String subject = inviterName + " te invita a colaborar en \"" + projectName + "\"";
        String body =
                """
                Hola,

                %s te invita a unirte al proyecto «%s» en SOrbitS.

                Abre este enlace para aceptar (válido 7 días):
                %s

                Si no tienes cuenta, podrás crearla al abrir el enlace.
                """
                        .formatted(inviterName, projectName, inviteUrl);

        if (!enabled || mailSender == null) {
            log.info("Invitación por email a {} (SMTP desactivado): {}", toEmail, inviteUrl);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email de invitación enviado a {}", toEmail);
        } catch (Exception ex) {
            log.warn("No se pudo enviar invitación a {}: {} — link: {}", toEmail, ex.getMessage(), inviteUrl);
        }
    }
}
