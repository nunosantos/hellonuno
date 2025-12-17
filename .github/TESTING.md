# Testing GitHub Actions Workflows

This guide shows how to validate and test the GitHub Actions workflows using GitHub CLI.

## Prerequisites

1. **Authenticate with GitHub CLI:**
```bash
gh auth login
```

2. **Enable GitHub Container Registry (GHCR):**
- GHCR is automatically available for all repositories
- No additional setup needed
- Uses `GITHUB_TOKEN` for authentication

3. **Enable GitHub Advanced Security (optional for CodeQL):**
- Free for public repositories
- Navigate to: Settings → Code security and analysis
- Enable: Dependency graph, Dependabot alerts, CodeQL analysis

## Validation Steps

### 1. Validate Workflow Syntax (Local)

```bash
# Using yamllint
yamllint .github/workflows/*.yml .github/dependabot.yml

# Check for common issues
grep -r "secrets\." .github/workflows/
grep -r "GITHUB_TOKEN" .github/workflows/
```

### 2. Push and Verify Workflows

```bash
# Push to GitHub
git push origin master

# Wait a moment for GitHub to process the workflows
sleep 5

# List all workflows
gh workflow list

# Expected output:
# CI - Build & Test                  active  <workflow_id>
# Docker Build & Push                active  <workflow_id>
# CodeQL Security Analysis           active  <workflow_id>
```

### 3. View Workflow Details

```bash
# View a specific workflow
gh workflow view "CI - Build & Test"
gh workflow view "Docker Build & Push"
gh workflow view "CodeQL Security Analysis"

# Check workflow runs
gh run list

# View the latest run
gh run list --limit 1

# View detailed run information
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### 4. Manual Workflow Trigger

```bash
# Trigger CI workflow
gh workflow run ci.yml

# Trigger Docker build
gh workflow run docker-build-push.yml

# Watch the run
gh run watch
```

### 5. Check Security Alerts

```bash
# Check code scanning alerts (CodeQL)
gh api repos/:owner/:repo/code-scanning/alerts | jq '.[].rule.description'

# Check Dependabot alerts
gh api repos/:owner/:repo/dependabot/alerts | jq '.[].security_advisory.summary'

# View vulnerability details
gh api repos/:owner/:repo/code-scanning/alerts --jq '.[] | {number, rule: .rule.id, severity: .rule.severity, path: .most_recent_instance.location.path}'
```

### 6. Verify Container Images

```bash
# List packages in GHCR
gh api user/packages?package_type=container

# View package details
gh api /user/packages/container/<package-name>

# Pull image locally
docker pull ghcr.io/<username>/<repo>/backend:latest
docker pull ghcr.io/<username>/<repo>/frontend:latest

# Verify image signatures
cosign verify ghcr.io/<username>/<repo>/backend:latest
```

### 7. Test Docker Images Locally

```bash
# Build locally (should match CI)
docker build -t test-backend ./hellonuno-backend
docker build -t test-frontend ./hellonuno-frontend

# Scan locally with Trivy
trivy image test-backend --severity HIGH,CRITICAL
trivy image test-frontend --severity HIGH,CRITICAL

# Check for secrets
trivy image test-backend --scanners secret
trivy image test-frontend --scanners secret
```

## Validation Checklist

### Pre-Push Checks
- [ ] YAML syntax is valid (`yamllint`)
- [ ] No hardcoded secrets in workflow files
- [ ] All workflow files are committed
- [ ] Dependabot configuration is valid

### Post-Push Checks
- [ ] All workflows appear in `gh workflow list`
- [ ] Workflows trigger on push (check `gh run list`)
- [ ] CI jobs complete successfully
- [ ] Docker images build without errors
- [ ] Security scans pass or have acceptable findings
- [ ] Images push to GHCR successfully
- [ ] Dependabot creates update PRs (within a week)

### Security Validation
- [ ] CodeQL analysis completes without critical issues
- [ ] Trivy scans show no HIGH/CRITICAL vulnerabilities
- [ ] No secrets detected in container images
- [ ] Images are signed with Cosign
- [ ] SBOM and provenance are generated
- [ ] Dependency review passes on PRs

## Common Issues and Solutions

### Issue: Workflow doesn't trigger

**Solution:**
```bash
# Check workflow syntax
yamllint .github/workflows/ci.yml

# Verify workflow is enabled
gh workflow view ci.yml

# Enable if disabled
gh workflow enable ci.yml

# Manually trigger
gh workflow run ci.yml
```

### Issue: Permission denied when pushing to GHCR

**Solution:**
1. Check repository settings: Settings → Actions → General
2. Ensure "Read and write permissions" is enabled for GITHUB_TOKEN
3. Verify package visibility settings

```bash
# Check current permissions
gh api repos/:owner/:repo/actions/permissions

# Update permissions (requires admin access)
gh api -X PUT repos/:owner/:repo/actions/permissions \
  -f default_workflow_permissions=write \
  -f can_approve_pull_request_reviews=true
```

### Issue: Security scan failures

**Solution:**
```bash
# View detailed scan results
gh run view <run-id> --log

# Check for specific vulnerabilities
trivy image ghcr.io/<username>/<repo>/backend:latest --format json

# Update dependencies
cd hellonuno-backend && dotnet list package --outdated
cd hellonuno-frontend && npm outdated
```

### Issue: CodeQL analysis fails

**Solution:**
1. Check build logs: `gh run view <run-id> --log`
2. Ensure project builds successfully locally
3. Verify CodeQL queries are compatible

```bash
# Test build locally
cd hellonuno-backend && dotnet build
cd hellonuno-frontend && npm run build
```

## Monitoring and Maintenance

### Daily Checks
```bash
# Check latest runs
gh run list --limit 5

# Check for failures
gh run list --status failure --limit 10
```

### Weekly Checks
```bash
# Review Dependabot PRs
gh pr list --label dependencies

# Check security alerts
gh api repos/:owner/:repo/code-scanning/alerts
gh api repos/:owner/:repo/dependabot/alerts

# Review and merge security updates
gh pr merge <pr-number> --auto --squash
```

### Monthly Reviews
- Review workflow run times and optimize
- Update base images in Dockerfiles
- Review and update GitHub Actions versions
- Audit security findings and remediate

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/)

## Quick Reference

```bash
# Most used commands
gh workflow list                           # List all workflows
gh workflow run <workflow.yml>             # Trigger workflow
gh run list                                # List recent runs
gh run view <run-id>                       # View run details
gh run view <run-id> --log                 # View run logs
gh run watch                               # Watch latest run
gh pr list --label dependencies            # List Dependabot PRs
gh api repos/:owner/:repo/code-scanning/alerts  # Security alerts
```
