package foo.shrigiri.issue_tracker.service;

import foo.shrigiri.issue_tracker.model.Issues;
import foo.shrigiri.issue_tracker.model.Projects;
import foo.shrigiri.issue_tracker.model.Users;
import foo.shrigiri.issue_tracker.repository.IssuesRepository;
import foo.shrigiri.issue_tracker.repository.ProjectRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class IssuesService {

    private final IssuesRepository issuesRepository;
    private final ProjectRepository projectRepository;

    public IssuesService(IssuesRepository issuesRepository, ProjectRepository projectRepository) {
        this.issuesRepository = issuesRepository;
        this.projectRepository = projectRepository;
        log.info("IssuesService initialized");
    }

    public List<Issues> getAllIssues() {
        log.debug("Retrieving all issues from database");
        List<Issues> issues = issuesRepository.findAll();
        log.info("Retrieved {} issues from database", issues.size());
        return issues;
    }

    public Optional<Issues> getIssueById(Integer id) {
        log.debug("Retrieving issue with id: {}", id);
        Optional<Issues> issue = issuesRepository.findById(id);
        if (issue.isPresent()) {
            log.info("Issue found with id: {}", id);
        } else {
            log.warn("Issue not found with id: {}", id);
        }
        return issue;
    }

    public String addIssue(Issues issue) {
        log.info("Saving new issue: {}", issue.getIssueTitle());
        Projects project1 = issue.getProject();
        if (project1 != null && project1.getProjId() != null) {
            if (project1.getProjectMembers() == null || project1.getProjectMembers().isEmpty()) {
                project1 = projectRepository.findById(project1.getProjId()).orElse(project1);
                issue.setProject(project1);
            }
        }
        if (project1 != null && project1.getProjectMembers() != null && !project1.getProjectMembers().isEmpty() && issue.getAssignedTo() != null && issue.getAssignedTo().getUserId() != null) {
            List<Integer> projectMembersId = project1.getProjectMembers().stream().map(Users::getUserId).toList();
            Integer issueAssignedUserId = issue.getAssignedTo().getUserId();
            if (projectMembersId.stream().noneMatch(userId -> userId.equals(issueAssignedUserId))) {
                log.info("User with id {} not a part of project team", issue.getAssignedTo().getUserId());
                return "User not a part of project team.";
            }
        }
        try {
            issuesRepository.save(issue);
            log.info("Issue saved successfully: {}", issue.getIssueTitle());
            return "Issue added succesfully";
        } catch (Exception e) {
            log.error("Failed to save issue: {}", e.getMessage(), e);
            return "Failed to add issue." + e.getMessage();
        }
    }

    public Issues updateIssue(Issues issue, String username) {
        log.info("Updating issue with id: {}", issue.getIssueId());
        Projects project1 = issue.getProject();
        if (project1 != null && project1.getProjId() != null) {
            if (project1.getProjectMembers() == null || project1.getProjectMembers().isEmpty()) {
                project1 = projectRepository.findById(project1.getProjId()).orElse(project1);
                issue.setProject(project1);
            }
        }
        if (project1 != null && project1.getProjectMembers() != null && !project1.getProjectMembers().isEmpty() && issue.getAssignedTo() != null && issue.getAssignedTo().getUserId() != null) {
            List<Integer> projectMembersId = project1.getProjectMembers().stream().map(Users::getUserId).toList();
            Integer issueAssignedUserId = issue.getAssignedTo().getUserId();
            if (projectMembersId.stream().noneMatch(userId -> userId.equals(issueAssignedUserId))) {
                log.info("User with id {} not a part of project team", issue.getAssignedTo().getUserId());
                throw new UsernameNotFoundException("User not part of the project team");
            }
        }
        Issues updated = issuesRepository.save(issue);
        log.info("Issue updated successfully with id: {}", updated.getIssueId());
        return updated;
    }

    public List<Issues> getIssuesByProjectId(Integer projectId) {
        log.debug("Retrieving issues for project id: {}", projectId);
        List<Issues> issues = issuesRepository.findByProject_ProjId(projectId);
        log.info("Retrieved {} issues for project id: {}", issues.size(), projectId);
        return issues;
    }

    public String deleteIssue(Integer id) {
        try {
            log.info("Deleting issue with id: {}", id);
            issuesRepository.deleteById(id);
            log.info("Issue deleted successfully for id {}", id);
            return "Issue deleted successfully.";
        } catch (Exception e) {
            log.error("Failed to delete issue for id: {}. ERROR: {}", id, e.getMessage(), e);
            return "Failed to delete issue." + e.getMessage();
        }
    }
}
