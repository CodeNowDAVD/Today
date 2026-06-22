package site.sorbits.user.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import site.sorbits.spacework.ProjectMemberRepository;
import site.sorbits.user.UserAccount;
import site.sorbits.user.UserAccountRepository;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserSearchController {

    private final UserAccountRepository userRepository;
    private final ProjectMemberRepository memberRepository;

    public UserSearchController(UserAccountRepository userRepository, ProjectMemberRepository memberRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    public record UserSearchHit(long id, String username) {}

    @GetMapping("/search")
    public List<UserSearchHit> search(
            @AuthenticationPrincipal UserAccount user,
            @RequestParam String q,
            @RequestParam(required = false) Long projectId) {
        String query = q == null ? "" : q.trim();
        if (query.length() < 2) {
            return List.of();
        }
        String needle = query.toLowerCase();
        Set<Long> memberIds = projectId == null
                ? Set.of()
                : memberRepository.findByProjectIdOrderByJoinedAtAsc(projectId).stream()
                        .map(m -> m.getUserId())
                        .collect(Collectors.toSet());
        return userRepository.findAllByOrderByUsernameAsc().stream()
                .filter(UserAccount::isActive)
                .filter(u -> !u.getId().equals(user.getId()))
                .filter(u -> !memberIds.contains(u.getId()))
                .filter(u -> u.getUsername().toLowerCase().contains(needle))
                .limit(10)
                .map(u -> new UserSearchHit(u.getId(), u.getUsername()))
                .toList();
    }
}
