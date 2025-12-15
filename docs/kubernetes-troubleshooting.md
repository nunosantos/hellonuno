# Kubernetes Troubleshooting Guide

This document covers the issues encountered when deploying the Hellonuno application to Kubernetes (Minikube) and how they were resolved.

## Table of Contents

- [Issue 1: ImageInspectError](#issue-1-imageinspecterror)
- [Issue 2: runAsNonRoot Verification Failed (Backend)](#issue-2-runasnonroot-verification-failed-backend)
- [Issue 3: Nginx Permission Denied (Frontend)](#issue-3-nginx-permission-denied-frontend)
- [Issue 4: Switching from Kustomize to Helm](#issue-4-switching-from-kustomize-to-helm)

---

## Issue 1: ImageInspectError

### Symptoms

```
$ kubectl get pods
NAME                                 READY   STATUS              RESTARTS   AGE
hellonuno-backend-c4f666967-4wxp7    0/1     ImageInspectError   0          7m37s
hellonuno-frontend-5cd8699f4-t7jsq   0/1     ImageInspectError   0          7m37s
```

### Root Cause

When using Minikube with the **podman driver** and **CRI-O runtime**, container images require fully qualified names. The error message from `kubectl describe pod` revealed:

```
Failed to inspect image "": rpc error: code = Unknown desc = short-name
"hellonuno-backend:latest" did not resolve to an alias and no
unqualified-search registries are defined in "/etc/containers/registries.conf"
```

### Diagnosis

```bash
# Check minikube runtime
minikube profile list

# Output showed:
# │ minikube │ podman │ crio │ ...
```

The images were built and loaded with the `localhost/` prefix:
```bash
minikube image ls | grep hellonuno
# localhost/hellonuno-frontend:latest
# localhost/hellonuno-backend:latest
```

But the deployments referenced them without the prefix:
```yaml
image: hellonuno-backend:latest  # Wrong
```

### Solution

Update all image references to include the `localhost/` prefix:

```yaml
# In deployment manifests or Helm values
image: localhost/hellonuno-backend:latest   # Correct
image: localhost/hellonuno-frontend:latest  # Correct
```

### Key Takeaway

When using Minikube with CRI-O/podman, always use fully qualified image names (`localhost/image:tag`) for local images.

---

## Issue 2: runAsNonRoot Verification Failed (Backend)

### Symptoms

```
$ kubectl get pods
NAME                                 READY   STATUS                       AGE
hellonuno-backend-6d68f97c89-7qzgr   0/1     CreateContainerConfigError   10s
```

### Root Cause

The pod had `runAsNonRoot: true` but the container image used a non-numeric username:

```
Error: container has runAsNonRoot and image has non-numeric user (appuser),
cannot verify user is non-root
```

### Diagnosis

The Dockerfile created a user with a name but Kubernetes couldn't verify it was non-root:

```dockerfile
# In Dockerfile
RUN adduser --disabled-password --gecos '' appuser
USER appuser
```

The deployment had:
```yaml
securityContext:
  runAsNonRoot: true
  # Missing: runAsUser with numeric UID
```

### Solution

Add an explicit numeric `runAsUser` to the security context:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000  # Explicit numeric UID
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

### Key Takeaway

When using `runAsNonRoot: true`, always specify `runAsUser` with a numeric UID so Kubernetes can verify the user is actually non-root.

---

## Issue 3: Nginx Permission Denied (Frontend)

### Symptoms

```
$ kubectl get pods
NAME                                  READY   STATUS             AGE
hellonuno-frontend-5f5d7745d4-t76tf   0/1     CrashLoopBackOff   5s
```

### Root Cause

Multiple issues with running nginx as non-root:

**Error 1**: Permission denied creating cache directory
```
nginx: [emerg] mkdir() "/var/cache/nginx/client_temp" failed (13: Permission denied)
```

**Error 2**: Cannot open config file
```
nginx: [emerg] open() "/etc/nginx/conf.d/default.conf" failed (13: Permission denied)
```

### Diagnosis

1. **Port 80 requires root**: Standard nginx listens on port 80 (privileged port)
2. **readOnlyRootFilesystem**: Blocks nginx from writing to cache directories
3. **Standard nginx image**: Entrypoint scripts try to modify config files
4. **Missing USER directive**: Dockerfile didn't switch to non-root user

### Solution

A multi-part fix was required:

#### 1. Use nginx-unprivileged image

```dockerfile
# Before
FROM nginx:alpine

# After
FROM nginxinc/nginx-unprivileged:alpine
```

#### 2. Change to non-privileged port (8080)

```nginx
# nginx.conf
server {
    listen 8080;  # Changed from 80
    ...
}
```

#### 3. Update Kubernetes deployment

```yaml
spec:
  containers:
    - name: frontend
      ports:
        - containerPort: 8080  # Changed from 80
      securityContext:
        runAsNonRoot: true
        runAsUser: 101  # nginx-unprivileged default UID
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
  volumes:
    - name: nginx-cache
      emptyDir: {}
    - name: nginx-run
      emptyDir: {}
    - name: nginx-tmp
      emptyDir: {}
```

#### 4. Update service targetPort

```yaml
# Service
spec:
  ports:
    - port: 80
      targetPort: 8080  # Changed from 80
```

### Key Takeaway

For secure nginx deployments:
- Use `nginxinc/nginx-unprivileged` image (runs as UID 101)
- Listen on port 8080+ (non-privileged)
- Mount emptyDir volumes for writable paths (`/var/cache/nginx`, `/var/run`, `/tmp`)

---

## Issue 4: Switching from Kustomize to Helm

### Symptoms

Resources in Lens showed `app.kubernetes.io/managed-by: kustomize` when Helm management was desired.

### Challenge

When trying to install Helm chart over existing Kustomize resources:

```
Error: INSTALLATION FAILED: Namespace "hellonuno" exists and cannot be
imported into the current release: invalid ownership metadata;
label validation error: key "app.kubernetes.io/managed-by" must equal "Helm"
```

### Solution

#### 1. Make namespace creation conditional in Helm

```yaml
# values.yaml
global:
  namespace: hellonuno
  createNamespace: false  # Skip if namespace exists
```

```yaml
# templates/namespace.yaml
{{- if .Values.global.createNamespace }}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.global.namespace }}
{{- end }}
```

#### 2. Delete Kustomize-managed resources (keep namespace)

```bash
kubectl delete deployment hellonuno-backend hellonuno-frontend -n hellonuno
kubectl delete service hellonuno-backend hellonuno-frontend -n hellonuno
kubectl delete ingress hellonuno-ingress -n hellonuno
```

#### 3. Install with Helm

```bash
helm install hellonuno ./helm/hellonuno -n hellonuno
```

### Verification

```bash
# Check Helm release
helm list -n hellonuno

# Verify labels
kubectl get deployments -n hellonuno --show-labels
# Should show: app.kubernetes.io/managed-by=Helm
```

### Key Takeaway

When migrating from Kustomize to Helm:
1. Delete existing resources (except namespace)
2. Make namespace creation conditional in Helm chart
3. Install fresh with Helm

---

## Quick Reference: Security Context Settings

### Backend (.NET)

| Setting | Value | Reason |
|---------|-------|--------|
| `runAsNonRoot` | `true` | Enforce non-root execution |
| `runAsUser` | `1000` | Explicit UID for verification |
| `allowPrivilegeEscalation` | `false` | Prevent privilege escalation |
| `readOnlyRootFilesystem` | `true` | Immutable container filesystem |

### Frontend (nginx-unprivileged)

| Setting | Value | Reason |
|---------|-------|--------|
| `runAsNonRoot` | `true` | Enforce non-root execution |
| `runAsUser` | `101` | nginx-unprivileged default UID |
| `allowPrivilegeEscalation` | `false` | Prevent privilege escalation |
| `readOnlyRootFilesystem` | `true` | Immutable container filesystem |
| `containerPort` | `8080` | Non-privileged port |

### Required emptyDir Volumes for nginx

| Mount Path | Purpose |
|------------|---------|
| `/var/cache/nginx` | Nginx cache files |
| `/var/run` | PID files |
| `/tmp` | Temporary files |

---

## Useful Commands

```bash
# Describe pod for detailed error messages
kubectl describe pod <pod-name> -n hellonuno

# Check pod logs
kubectl logs <pod-name> -n hellonuno

# Check images in minikube
minikube image ls | grep hellonuno

# Check minikube runtime
minikube profile list

# Build and load image for minikube (podman/crio)
podman build -t localhost/hellonuno-frontend:latest .
podman save localhost/hellonuno-frontend:latest | minikube image load -

# Verify Helm release
helm list -n hellonuno

# Check resource labels
kubectl get all -n hellonuno --show-labels
```
