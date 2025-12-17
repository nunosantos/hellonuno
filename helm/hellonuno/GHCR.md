# Using GitHub Container Registry (GHCR) with Helm

This Helm chart is configured to pull container images from GitHub Container Registry (GHCR).

## Image Configuration

### Current Settings

**Backend:**
- Repository: `ghcr.io/nunosantos/hellonuno/backend`
- Tag: `latest`
- Pull Policy: `Always`

**Frontend:**
- Repository: `ghcr.io/nunosantos/hellonuno/frontend`
- Tag: `latest`
- Pull Policy: `Always`

## Public vs Private Images

### Public Images (Default)

If your GHCR images are **public**, no authentication is required. The images will pull automatically.

### Private Images

If your GHCR images are **private**, you need to create an image pull secret:

#### 1. Create a GitHub Personal Access Token

Generate a token with `read:packages` scope:
```bash
gh auth token
```

#### 2. Create Kubernetes Secret

```bash
kubectl create secret docker-registry ghcr-secret \
  --namespace=hellonuno \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=YOUR_EMAIL
```

#### 3. Update values.yaml

Uncomment the imagePullSecrets section:
```yaml
imagePullSecrets:
  - name: ghcr-secret
```

## Making Images Public

To make your GHCR images public (recommended for this project):

### Via GitHub UI:
1. Go to https://github.com/users/YOUR_USERNAME/packages
2. Click on your package (backend or frontend)
3. Click "Package settings"
4. Scroll to "Danger Zone"
5. Click "Change visibility"
6. Select "Public"

### Via GitHub CLI:
```bash
# Make backend public
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /user/packages/container/hellonuno%2Fbackend/visibility \
  -f visibility='public'

# Make frontend public
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /user/packages/container/hellonuno%2Ffrontend/visibility \
  -f visibility='public'
```

## Image Tagging Strategy

The GitHub Actions workflow creates multiple tags:

- `latest` - Latest build from master branch
- `master-<sha>` - Specific commit from master
- `pr-<number>` - Pull request builds
- `v1.0.0` - Semantic version tags

### Using Specific Versions

To use a specific version instead of `latest`:

```yaml
backend:
  image:
    tag: master-abc1234  # Use specific commit

frontend:
  image:
    tag: v1.0.0  # Use semantic version
```

## Verifying Images

### Check if images exist:
```bash
# List all packages
gh api user/packages?package_type=container

# Check backend image
docker pull ghcr.io/nunosantos/hellonuno/backend:latest

# Check frontend image
docker pull ghcr.io/nunosantos/hellonuno/frontend:latest
```

### View image details:
```bash
# Backend tags
gh api /user/packages/container/hellonuno%2Fbackend/versions

# Frontend tags
gh api /user/packages/container/hellonuno%2Ffrontend/versions
```

## Troubleshooting

### Image Pull Errors

**Error:** `ErrImagePull` or `ImagePullBackOff`

**Solutions:**

1. **Check image exists:**
   ```bash
   docker pull ghcr.io/nunosantos/hellonuno/backend:latest
   ```

2. **Check image visibility:**
   - Ensure images are public OR
   - Verify imagePullSecret is created and configured

3. **Verify secret:**
   ```bash
   kubectl get secret ghcr-secret -n hellonuno
   kubectl describe secret ghcr-secret -n hellonuno
   ```

4. **Test authentication:**
   ```bash
   kubectl run test-pull \
     --image=ghcr.io/nunosantos/hellonuno/backend:latest \
     --namespace=hellonuno \
     --restart=Never
   ```

### Authentication Issues

**Error:** `unauthorized: authentication required`

1. **Verify token has correct permissions:**
   - Required: `read:packages` scope
   - Check: `gh auth status`

2. **Recreate secret:**
   ```bash
   kubectl delete secret ghcr-secret -n hellonuno
   # Then recreate with steps above
   ```

3. **Check token expiration:**
   - GitHub tokens can expire
   - Generate new token if needed

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Builds Docker images on push to master
2. Scans images for vulnerabilities
3. Signs images with Cosign
4. Pushes to GHCR with multiple tags
5. Updates Helm values with new image tags

### Workflow File
See: `.github/workflows/docker-build-push.yml`

## Local Development

For local Kubernetes (minikube/kind), you can still use local images:

```yaml
backend:
  image:
    repository: localhost/hellonuno-backend
    tag: latest
    pullPolicy: IfNotPresent

frontend:
  image:
    repository: localhost/hellonuno-frontend
    tag: latest
    pullPolicy: IfNotPresent
```

Then build and load images:
```bash
# Build
docker build -t localhost/hellonuno-backend:latest ./hellonuno-backend
docker build -t localhost/hellonuno-frontend:latest ./hellonuno-frontend

# Load into minikube
minikube image load localhost/hellonuno-backend:latest
minikube image load localhost/hellonuno-frontend:latest
```

## References

- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Kubernetes Image Pull Secrets](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
- [GitHub Actions Container Publishing](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
