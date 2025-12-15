# Hellonuno

A full-stack application with a .NET backend and React frontend, deployed to Kubernetes using ArgoCD.

## Project Structure

```
hellonuno/
├── hellonuno-backend/     # .NET 8 API backend
├── hellonuno-frontend/    # React + Vite frontend
├── k8s/                   # Kubernetes manifests (Kustomize)
│   ├── base/              # Base configurations
│   └── overlays/          # Environment-specific overlays
├── helm/                  # Helm charts
└── docker-compose.yaml    # Local development
```

## Kubernetes Security Fixes Applied

This project was configured with security best practices for running containers as non-root in Kubernetes. Here's what was fixed:

### Issue 1: ImageInspectError

**Problem**: Minikube with CRI-O runtime requires fully qualified image names.

**Solution**: Changed image references from `hellonuno-backend:latest` to `localhost/hellonuno-backend:latest` in deployment manifests.

### Issue 2: Backend - runAsNonRoot Verification Failed

**Problem**: Kubernetes `runAsNonRoot: true` security context couldn't verify the container user because `appuser` was a non-numeric username.

**Error**:
```
container has runAsNonRoot and image has non-numeric user (appuser), cannot verify user is non-root
```

**Solution**: Added explicit `runAsUser: 1000` to the security context in `k8s/base/backend-deployment.yaml`.

### Issue 3: Frontend - Nginx Permission Denied

**Problem**: Standard nginx image requires root privileges for:
- Binding to port 80 (privileged port)
- Writing to `/var/cache/nginx` and `/var/run`
- Modifying config files on startup

**Error**:
```
mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)
```

**Solution**:
1. Switched to `nginxinc/nginx-unprivileged:alpine` base image (runs as UID 101)
2. Changed nginx to listen on port 8080 (non-privileged)
3. Added emptyDir volumes for writable directories:
   - `/var/cache/nginx`
   - `/var/run`
   - `/tmp`

## Files Modified

| File | Changes |
|------|---------|
| `k8s/base/backend-deployment.yaml` | Added `runAsUser: 1000`, fixed image path |
| `k8s/base/frontend-deployment.yaml` | Changed port to 8080, `runAsUser: 101`, added emptyDir volumes |
| `k8s/base/frontend-service.yaml` | Updated `targetPort` from 80 to 8080 |
| `hellonuno-frontend/Dockerfile` | Switched to `nginx-unprivileged`, removed manual user setup |
| `hellonuno-frontend/nginx.conf` | Changed listen port from 80 to 8080 |

## Security Context Configuration

### Backend Deployment
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

### Frontend Deployment
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 101  # nginx-unprivileged default user
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
volumeMounts:
  - name: nginx-cache
    mountPath: /var/cache/nginx
  - name: nginx-run
    mountPath: /var/run
  - name: nginx-tmp
    mountPath: /tmp
```

## Building and Deploying

### Build images for Minikube (with podman/crio)

```bash
# Build backend
cd hellonuno-backend
podman build -t localhost/hellonuno-backend:latest .
podman save localhost/hellonuno-backend:latest | minikube image load -

# Build frontend
cd hellonuno-frontend
podman build -t localhost/hellonuno-frontend:latest .
podman save localhost/hellonuno-frontend:latest | minikube image load -
```

### Deploy to Kubernetes

```bash
kubectl apply -k k8s/base/
```

### Verify deployment

```bash
kubectl get pods -n hellonuno
kubectl get deployments -n hellonuno
```

## Local Development

```bash
docker-compose up
```

## Architecture Notes

- **Backend**: ASP.NET Core 8 API running on port 8080
- **Frontend**: React + Vite served by nginx-unprivileged on port 8080
- **Container Runtime**: Minikube with podman driver and CRI-O runtime
- **GitOps**: ArgoCD for continuous deployment
