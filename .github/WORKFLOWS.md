# GitHub Actions Workflows

This repository uses GitHub Actions for CI/CD with comprehensive security scanning.

## Workflows

### 1. CI - Build & Test (`ci.yml`)

**Triggers:** Push to master/main/develop, Pull Requests

**Jobs:**
- **Backend Build & Test**: Builds .NET backend, runs tests, generates coverage
- **Backend Security**: Scans for vulnerable packages, runs dependency review
- **Frontend Build & Test**: Builds React frontend, lints code, generates artifacts
- **Frontend Security**: Runs npm audit, dependency review
- **Helm Validation**: Lints and templates Helm charts
- **CI Summary**: Validates all checks passed

### 2. Docker Build & Push (`docker-build-push.yml`)

**Triggers:** Push to master/main, Tags (v*.*.*), Pull Requests

**Jobs:**
- **Build Backend Image**:
  - Builds Docker image
  - Scans with Trivy for vulnerabilities (HIGH/CRITICAL)
  - Scans for secrets
  - Pushes to GitHub Container Registry (GHCR)
  - Generates SBOM and provenance

- **Build Frontend Image**:
  - Builds Docker image with Vite
  - Scans with Trivy for vulnerabilities
  - Scans for secrets
  - Pushes to GHCR
  - Generates SBOM and provenance

- **Sign Images**:
  - Signs images with Cosign (keyless)
  - Uses Sigstore for verification

- **Update Helm Values**:
  - Auto-updates image tags in Helm values
  - Commits changes for ArgoCD to sync

### 3. CodeQL Analysis (`codeql-analysis.yml`)

**Triggers:** Push, Pull Requests, Weekly schedule (Mondays)

**Languages:** JavaScript/TypeScript, C#

**Security Queries:**
- Security-extended queries
- Security and quality checks
- SAST analysis for common vulnerabilities

### 4. Dependabot (`dependabot.yml`)

**Schedule:** Weekly (Mondays at 9 AM)

**Ecosystems:**
- npm (frontend dependencies)
- NuGet (backend dependencies)
- Docker (base images)
- GitHub Actions (workflow actions)

**Features:**
- Auto-creates PRs for updates
- Includes security patches
- Groups related updates

## Security Features

### Container Security
- ✅ Trivy vulnerability scanning
- ✅ Secret detection
- ✅ Image signing with Cosign/Sigstore
- ✅ SBOM generation
- ✅ Provenance attestation

### Dependency Security
- ✅ Automated dependency updates (Dependabot)
- ✅ Dependency review on PRs
- ✅ Vulnerable package detection
- ✅ npm audit
- ✅ .NET security scanning

### Code Security
- ✅ CodeQL SAST analysis
- ✅ Security-extended queries
- ✅ Weekly scheduled scans
- ✅ Security event tracking

## GitHub Container Registry (GHCR)

Images are published to:
- `ghcr.io/<owner>/<repo>/backend:latest`
- `ghcr.io/<owner>/<repo>/frontend:latest`

**Image Tags:**
- `latest` - Latest build from master/main
- `<branch>-<sha>` - Branch builds with commit SHA
- `v*.*.*` - Semantic version tags
- `pr-<number>` - Pull request builds

## Required Secrets

The workflows use GitHub's automatic `GITHUB_TOKEN` which provides:
- Read access to repository
- Write access to packages (GHCR)
- Write access to security events

**No additional secrets required!**

## Usage

### Viewing Workflow Runs
```bash
gh workflow list
gh run list
gh run view <run-id>
```

### Triggering Manual Runs
```bash
gh workflow run ci.yml
gh workflow run docker-build-push.yml
```

### Checking Security Alerts
```bash
gh api repos/:owner/:repo/code-scanning/alerts
gh api repos/:owner/:repo/dependabot/alerts
```

## Best Practices

1. **Branch Protection**: Enable required status checks
2. **Code Review**: Require PR reviews before merging
3. **Security Alerts**: Monitor CodeQL and Dependabot alerts
4. **Image Updates**: Review and merge Dependabot PRs regularly
5. **Secrets**: Never commit secrets, use GitHub Secrets or external vaults

## Troubleshooting

### Build Failures
- Check workflow logs: `gh run view <run-id> --log`
- Review failed jobs
- Validate Docker builds locally

### Security Failures
- Review Trivy scan results
- Fix HIGH/CRITICAL vulnerabilities
- Update dependencies

### Push Failures
- Verify GITHUB_TOKEN permissions
- Check package visibility settings
- Ensure GHCR is enabled

## Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- [CodeQL Documentation](https://codeql.github.com/)
- [Cosign Image Signing](https://github.com/sigstore/cosign)
