package foo.shrigiri.issue_tracker.controller;

import foo.shrigiri.issue_tracker.dto.CommentRequest;
import foo.shrigiri.issue_tracker.model.Comments;
import foo.shrigiri.issue_tracker.model.Issues;
import foo.shrigiri.issue_tracker.model.Projects;
import foo.shrigiri.issue_tracker.model.Users;
import foo.shrigiri.issue_tracker.service.CommentService;
import foo.shrigiri.issue_tracker.service.IssuesService;
import foo.shrigiri.issue_tracker.service.ProjectService;
import foo.shrigiri.issue_tracker.service.UsersService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller
@Slf4j
public class WebController {

    private final ProjectService projectService;
    private final IssuesService issuesService;
    private final UsersService usersService;
    private final CommentService commentService;

    public WebController(ProjectService projectService,
                         IssuesService issuesService,
                         UsersService usersService,
                         CommentService commentService) {
        this.projectService = projectService;
        this.issuesService = issuesService;
        this.usersService = usersService;
        this.commentService = commentService;
        log.info("WebController initialized");
    }

    // ─── Root ────────────────────────────────────────────────────────────────────

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }

    // ─── Login / Register ────────────────────────────────────────────────────────

    @GetMapping("/login")
    public String loginPage() {
        return "login";
    }

    @GetMapping("/register")
    public String registerPage(Model model) {
        model.addAttribute("user", new Users());
        return "register";
    }

    @PostMapping("/register")
    public String register(@ModelAttribute Users user, RedirectAttributes redirectAttributes) {
        log.info("Web registration attempt for username: {}", user.getUsername());
        try {
            usersService.register(user);
            redirectAttributes.addFlashAttribute("success", "Account created! Please log in.");
            return "redirect:/login";
        } catch (Exception e) {
            log.error("Registration failed: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Registration failed: " + e.getMessage());
            return "redirect:/register";
        }
    }

    // ─── Dashboard ───────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    public String dashboard(Model model, Authentication authentication) {
        log.debug("Loading dashboard");
        List<Projects> projects = projectService.getAllProjects(authentication.getName());

        // Build issue count map: projectId -> count
        Map<Integer, Long> issueCountMap = projects.stream()
                .collect(Collectors.toMap(
                        Projects::getProjId,
                        p -> (long) issuesService.getIssuesByProjectId(p.getProjId()).size()
                ));

        model.addAttribute("projects", projects);
        model.addAttribute("issueCountMap", issueCountMap);
        model.addAttribute("currentUser", authentication.getName());
        model.addAttribute("newProject", new Projects());
        // Inject all users so the create-project member picker is populated server-side
        model.addAttribute("allUsers", usersService.getAllUsers());
        log.info("Dashboard loaded with {} projects", projects.size());
        return "dashboard";
    }

    @PostMapping("/projects")
    public String createProject(@ModelAttribute Projects project,
                                @RequestParam(value = "memberIds", required = false) List<Integer> memberIds,
                                Authentication authentication,
                                RedirectAttributes redirectAttributes) {
        log.info("Creating project: {}", project.getProjTitle());
        try {
            // Resolve owner from logged-in user and set the full Users entity
            Users owner = usersService.findByUsername(authentication.getName());
            if (owner != null) {
                project.setOwnerId(owner); // Projects.ownerId is a Users entity
            }
            List<Integer> ids = memberIds != null ? memberIds : List.of();
            projectService.addProject(project, ids);
            redirectAttributes.addFlashAttribute("success", "Project created successfully.");
        } catch (Exception e) {
            log.error("Failed to create project: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to create project.");
        }
        return "redirect:/dashboard";
    }

    // ─── Project Detail ──────────────────────────────────────────────────────────

    @GetMapping("/projects/{id}")
    public String projectDetail(@PathVariable Integer id, Model model, Authentication authentication) {
        log.debug("Loading project detail for id: {}", id);
        Optional<Projects> projectOpt = projectService.getProjectById(id);
        if (projectOpt.isEmpty()) {
            return "redirect:/dashboard";
        }

        Projects project = projectOpt.get();
        List<Issues> issues = issuesService.getIssuesByProjectId(id);

        // Build a user map for template use (userId -> username)
        List<Users> allUsers = usersService.getAllUsers();
        Map<Integer, String> userMap = allUsers.stream()
                .collect(Collectors.toMap(Users::getUserId, Users::getUsername));

        // project.getOwnerId() returns a Users entity
        String ownerName = project.getOwnerId() != null
                ? project.getOwnerId().getUsername()
                : "Unknown";

        model.addAttribute("project", project);
        model.addAttribute("issues", issues);
        model.addAttribute("userMap", userMap);
        model.addAttribute("ownerName", ownerName);
        model.addAttribute("allUsers", allUsers);
        model.addAttribute("currentUser", authentication != null ? authentication.getName() : "");
        model.addAttribute("newIssue", new Issues());
        log.info("Project detail loaded: {} issues for project {}", issues.size(), project.getProjTitle());
        return "project-detail";
    }

    @PostMapping("/projects/{id}/issues")
    public String createIssue(@PathVariable Integer id,
                              @ModelAttribute Issues issue,
                              Authentication authentication,
                              RedirectAttributes redirectAttributes) {
        log.info("Creating issue '{}' for project {}", issue.getIssueTitle(), id);
        try {
            // Issues.project is a Projects entity, not a raw int
            Projects project = projectService.getProjectById(id)
                    .orElseThrow(() -> new RuntimeException("Project not found: " + id));
            issue.setProject(project);

            Users creator = usersService.findByUsername(authentication.getName());
            if (creator != null) {
                issue.setCreatedBy(creator); // Issues.createdBy is a Users entity
            }
            if (issue.getStatus() == null || issue.getStatus().isBlank()) {
                issue.setStatus("OPEN");
            }
            if (issue.getPriority() == null || issue.getPriority().isBlank()) {
                issue.setPriority("MEDIUM");
            }
            issuesService.addIssue(issue);
            redirectAttributes.addFlashAttribute("success", "Issue created successfully.");
        } catch (Exception e) {
            log.error("Failed to create issue: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to create issue.");
        }
        return "redirect:/projects/" + id;
    }

    // ─── Issue Detail ────────────────────────────────────────────────────────────

    @GetMapping("/issues/{id}")
    public String issueDetail(@PathVariable Integer id, Model model, Authentication authentication) {
        log.debug("Loading issue detail for id: {}", id);
        Optional<Issues> issueOpt = issuesService.getIssueById(id);
        if (issueOpt.isEmpty()) {
            return "redirect:/dashboard";
        }

        Issues issue = issueOpt.get();

        // issue.getProject() returns the Projects entity
        Projects issueProject = issue.getProject();
        Integer projectId = issueProject != null ? issueProject.getProjId() : null;
        String projectName = issueProject != null ? issueProject.getProjTitle() : "Unknown Project";

        // issue.getCreatedBy() / getAssignedTo() return Users entities
        String createdByName = issue.getCreatedBy() != null
                ? issue.getCreatedBy().getUsername()
                : "Unknown";
        String assignedToName = issue.getAssignedTo() != null
                ? issue.getAssignedTo().getUsername()
                : "Unassigned";

        List<Users> projectMembers = issueProject != null && issueProject.getProjectMembers() != null
                ? issueProject.getProjectMembers()
                : List.of();

        model.addAttribute("issue", issue);
        model.addAttribute("projectName", projectName);
        model.addAttribute("projectId", projectId);
        model.addAttribute("createdByName", createdByName);
        model.addAttribute("assignedToName", assignedToName);
        model.addAttribute("projectMembers", projectMembers);
        model.addAttribute("currentUser", authentication != null ? authentication.getName() : "");
        log.info("Issue detail loaded for issue id: {}", id);
        return "issue-detail";
    }

    @PostMapping("/issues/{id}/update")
    public String updateIssue(@PathVariable Integer id,
                              @ModelAttribute Issues issue,
                              RedirectAttributes redirectAttributes) {
        log.info("Updating issue id: {}", id);
        try {
            Issues existing = issuesService.getIssueById(id).orElseThrow();
            existing.setIssueTitle(issue.getIssueTitle());
            existing.setIssueDesc(issue.getIssueDesc());
            existing.setStatus(issue.getStatus());
            existing.setPriority(issue.getPriority());
            existing.setAssignedTo(issue.getAssignedTo());
            issuesService.updateIssue(existing, null);
            redirectAttributes.addFlashAttribute("success", "Issue updated successfully.");
        } catch (Exception e) {
            log.error("Failed to update issue: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to update issue.");
        }
        return "redirect:/issues/" + id;
    }

    @PostMapping("/issues/{id}/delete")
    public String deleteIssue(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        log.info("Deleting issue id: {}", id);
        try {
            Issues issue = issuesService.getIssueById(id).orElseThrow();
            // issue.getProject() returns the Projects entity
            Integer projectId = issue.getProject() != null ? issue.getProject().getProjId() : null;
            issuesService.deleteIssue(id);
            redirectAttributes.addFlashAttribute("success", "Issue #" + id + " deleted successfully.");
            return projectId != null ? "redirect:/projects/" + projectId : "redirect:/dashboard";
        } catch (Exception e) {
            log.error("Failed to delete issue: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to delete issue.");
            return "redirect:/issues/" + id;
        }
    }

    // ─── Comments (session-authenticated JSON endpoints) ──────────────────────────

    @PostMapping("/issues/{issueId}/comments")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> addComment(@PathVariable Integer issueId,
                                                          @RequestBody CommentRequest commentRequest,
                                                          Authentication authentication) {
        log.info("Adding comment to issue {}", issueId);
        String username = authentication.getName();
        Comments saved = commentService.addComment(issueId, commentRequest, username);
        Map<String, Object> response = new HashMap<>();
        response.put("commentId",   saved.getCommentId());
        response.put("commentData", saved.getCommentData());
        response.put("authorUsername", saved.getCommentAuthor() != null ? saved.getCommentAuthor().getUsername() : "");
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/issues/{issueId}/comments/{commentId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateComment(@PathVariable Integer issueId,
                                                             @PathVariable Integer commentId,
                                                             @RequestBody String newText,
                                                             Authentication authentication) {
        log.info("Updating comment {} on issue {}", commentId, issueId);
        Comments updated = commentService.updateCommentContent(commentId, newText);
        Map<String, Object> response = new HashMap<>();
        response.put("commentId",   updated.getCommentId());
        response.put("commentData", updated.getCommentData());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/issues/{issueId}/comments/{commentId}")
    @ResponseBody
    public ResponseEntity<String> deleteComment(@PathVariable Integer issueId,
                                                @PathVariable Integer commentId,
                                                Authentication authentication) {
        log.info("Deleting comment {} on issue {}", commentId, issueId);
        String result = commentService.deleteComment(commentId);
        return ResponseEntity.ok(result);
    }

    // ─── Profile ─────────────────────────────────────────────────────────────────

    @GetMapping("/profile")
    public String profilePage(Model model, Authentication authentication) {
        String username = authentication.getName();
        log.debug("Loading profile for user: {}", username);
        Users user = usersService.findByUsername(username);
        model.addAttribute("profileUser", user);
        model.addAttribute("currentUser", username);
        return "profile";
    }

    @PostMapping("/profile/change-password")
    public String changePassword(@RequestParam("currentPassword") String currentPassword,
                                 @RequestParam("newPassword") String newPassword,
                                 @RequestParam("confirmPassword") String confirmPassword,
                                 Authentication authentication,
                                 RedirectAttributes redirectAttributes) {
        String username = authentication.getName();
        log.info("Change password requested for user: {}", username);

        if (newPassword == null || newPassword.isBlank()) {
            redirectAttributes.addFlashAttribute("error", "New password cannot be empty.");
            return "redirect:/profile";
        }
        if (!newPassword.equals(confirmPassword)) {
            redirectAttributes.addFlashAttribute("error", "New passwords do not match.");
            return "redirect:/profile";
        }
        if (newPassword.length() < 6) {
            redirectAttributes.addFlashAttribute("error", "Password must be at least 6 characters.");
            return "redirect:/profile";
        }

        try {
            Users user = usersService.findByUsername(username);
            if (user == null) {
                redirectAttributes.addFlashAttribute("error", "User not found.");
                return "redirect:/profile";
            }
            String result = usersService.updatePassword(user.getUserId(), currentPassword, newPassword);
            if (result.equals("Password updated successfully")) {
                redirectAttributes.addFlashAttribute("success", "Password changed successfully!");
            } else {
                redirectAttributes.addFlashAttribute("error", result);
            }
        } catch (Exception e) {
            log.error("Failed to change password for {}: {}", username, e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to change password: " + e.getMessage());
        }
        return "redirect:/profile";
    }

    @PostMapping("/profile/delete")
    public String deleteAccount(Authentication authentication,
                                HttpServletRequest request) {
        String username = authentication.getName();
        log.info("Delete account requested for user: {}", username);
        try {
            Users user = usersService.findByUsername(username);
            if (user != null) {
                usersService.deleteUser(user.getUserId());
            }
            // Invalidate session so Spring Security clears the principal
            request.getSession().invalidate();
            log.info("Account deleted and session invalidated for user: {}", username);
        } catch (Exception e) {
            log.error("Failed to delete account for {}: {}", username, e.getMessage());
        }
        return "redirect:/login?accountDeleted";
    }

    // ─── Project Update / Delete ──────────────────────────────────────────────────

    @PostMapping("/projects/{id}/update")
    public String updateProject(@PathVariable Integer id,
                                @ModelAttribute Projects project,
                                @RequestParam(value = "memberIds", required = false) List<Integer> memberIds,
                                RedirectAttributes redirectAttributes) {
        log.info("Updating project id: {}, title: {}, memberIds: {}", id, project.getProjTitle(), memberIds);
        try {
            Projects existing = projectService.getProjectById(id).orElseThrow();
            existing.setProjTitle(project.getProjTitle());
            existing.setProjDesc(project.getProjDesc());
            List<Integer> ids = memberIds != null ? memberIds : List.of();
            projectService.updateProject(id, existing, ids);
            redirectAttributes.addFlashAttribute("success", "Project updated successfully.");
        } catch (Exception e) {
            log.error("Failed to update project id: {}", id, e);
            redirectAttributes.addFlashAttribute("error", "Failed to update project: " + e.getClass().getSimpleName());
        }
        return "redirect:/projects/" + id;
    }

    @PostMapping("/projects/{id}/delete")
    public String deleteProject(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        log.info("Deleting project id: {}", id);
        try {
            projectService.deleteProject(id);
            redirectAttributes.addFlashAttribute("success", "Project deleted successfully.");
        } catch (Exception e) {
            log.error("Failed to delete project: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", "Failed to delete project.");
        }
        return "redirect:/dashboard";
    }
}
