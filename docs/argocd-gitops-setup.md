# ArgoCD GitOps Setup Guide

This guide documents the GitOps implementation for the HelloNuno application using ArgoCD.

## Overview

ArgoCD is a declarative, GitOps continuous delivery tool for Kubernetes. It monitors your Git repository and automatically synchronizes the desired state (defined in Git) with the actual state in your Kubernetes cluster.

## What is GitOps?

GitOps is a way of managing Kubernetes deployments where:
- **Git is the single source of truth** - All configuration is stored in Git
- **Automated deployment** - Changes in Git automatically deploy to Kubernetes
- **Self-healing** - Manual changes to the cluster are automatically reverted
- **Audit trail** - Git history provides complete deployment history

## Architecture

```
GitHub Repository (nunosantos/hellonuno)
    ↓
    └─ helm/hellonuno/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── backend-deployment.yaml
            ├── frontend-deployment.yaml
            └── ...
    ↓
ArgoCD (monitors repository)
    ↓
Kubernetes Cluster (hellonuno namespace)
    ├── Backend Pods (2 replicas)
    └── Frontend Pods (2 replicas)
```

## Setup Steps

### 1. ArgoCD Application Manifest

Created `argocd/application.yaml` with the following configuration:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hellonuno
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  
  source:
    repoURL: https://github.com/nunosantos/hellonuno.git
    targetRevision: HEAD
    path: helm/hellonuno
    helm:
      valueFiles:
        - values.yaml
  
  destination:
    server: https://kubernetes.default.svc
    namespace: hellonuno
  
  syncPolicy:
    automated:
      prune: true        # Delete resources when removed from git
      selfHeal: true     # Revert manual changes
      allowEmpty: false  # Don't sync if source is empty
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### 2. Key Configuration Settings

| Setting | Value | Description |
|---------|-------|-------------|
| **Source Repository** | `https://github.com/nunosantos/hellonuno.git` | GitHub repository to monitor |
| **Source Path** | `helm/hellonuno` | Directory containing Helm chart |
| **Target Revision** | `HEAD` | Tracks latest commit on master branch |
| **Destination Namespace** | `hellonuno` | Kubernetes namespace for deployment |
| **Auto Sync** | `enabled` | Automatically applies changes from Git |
| **Self Heal** | `enabled` | Reverts manual kubectl changes |
| **Prune** | `enabled` | Deletes resources removed from Git |

### 3. Deployment Process

1. **Uninstalled existing Helm release:**
   ```bash
   helm uninstall hellonuno -n hellonuno
   ```
   This was necessary because ArgoCD needs to take ownership of the resources.

2. **Applied ArgoCD Application:**
   ```bash
   kubectl apply -f argocd/application.yaml
   ```

3. **ArgoCD automatically synced** the application from Git and deployed all resources.

## Current Deployment

After successful deployment, the following resources are managed by ArgoCD:

```
NAME                                      READY   STATUS    RESTARTS   AGE
pod/hellonuno-backend-668674df94-4jcss    1/1     Running   0          40s
pod/hellonuno-backend-668674df94-6pl8l    1/1     Running   0          40s
pod/hellonuno-frontend-77c99466dc-4zgh9   1/1     Running   0          40s
pod/hellonuno-frontend-77c99466dc-76xj5   1/1     Running   0          40s

NAME                         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
service/hellonuno-backend    ClusterIP   10.102.191.123   <none>        80/TCP    40s
service/hellonuno-frontend   ClusterIP   10.110.7.182     <none>        80/TCP    40s

NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/hellonuno-backend    2/2     2            2           40s
deployment.apps/hellonuno-frontend   2/2     2            2           40s
```

## How to Use

### Making Changes

1. **Edit Helm chart files** in `helm/hellonuno/`
2. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Update deployment configuration"
   git push
   ```
3. **ArgoCD automatically detects** the change (within 3 minutes)
4. **Application syncs** and deploys the new configuration

### Monitoring ArgoCD

**Check Application status:**
```bash
kubectl get application hellonuno -n argocd
```

**Watch Application sync:**
```bash
kubectl get application hellonuno -n argocd -w
```

**View detailed status:**
```bash
kubectl describe application hellonuno -n argocd
```

**Check pods in hellonuno namespace:**
```bash
kubectl get pods -n hellonuno
```

### Understanding Sync Status

- **Synced** - Cluster state matches Git
- **OutOfSync** - Changes detected in Git, sync pending
- **Progressing** - Deployment in progress
- **Healthy** - All resources running successfully
- **Degraded** - Some resources failing

### ArgoCD UI (if accessible)

If ArgoCD UI is available, you can:
- View application topology
- See sync status visually
- Manually trigger sync
- View deployment history
- Roll back to previous versions

Access typically via: `kubectl port-forward svc/argocd-server -n argocd 8080:443`

## Benefits of This Setup

1. **Version Control** - All infrastructure changes tracked in Git
2. **Automated Deployments** - No manual kubectl commands needed
3. **Drift Detection** - Detects and corrects manual changes
4. **Easy Rollbacks** - Revert Git commit to rollback deployment
5. **Audit Trail** - Git history shows who changed what and when
6. **Declarative** - Desired state defined in code, not imperative commands

## Important Notes

### Self-Heal Feature

With `selfHeal: true`, any manual changes made with `kubectl` will be automatically reverted:

```bash
# This change will be reverted by ArgoCD
kubectl scale deployment hellonuno-backend --replicas=5 -n hellonuno

# ArgoCD will restore to 2 replicas (as defined in Git)
```

To make permanent changes, update the Helm chart in Git instead.

### Prune Feature

With `prune: true`, resources deleted from Git will be deleted from cluster:

```bash
# If you remove a service from helm/hellonuno/templates/
# ArgoCD will delete it from the cluster automatically
```

### Namespace Management

The `CreateNamespace=true` option ensures the `hellonuno` namespace is created automatically if it doesn't exist.

## Troubleshooting

### Application not syncing

Check ArgoCD Application logs:
```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

### Sync failing

View application events:
```bash
kubectl describe application hellonuno -n argocd
```

### Manual sync

Force a manual sync:
```bash
kubectl patch application hellonuno -n argocd --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'
```

## Files Modified/Created

- `argocd/application.yaml` - ArgoCD Application manifest
- `docs/argocd-gitops-setup.md` - This documentation

## Next Steps

Consider enhancing the setup with:
- **Multiple environments** (dev/staging/prod) with separate ArgoCD Applications
- **Webhook configuration** for instant sync instead of 3-minute polling
- **Notifications** for sync failures or health issues
- **RBAC** for team-based access control
- **App of Apps pattern** for managing multiple applications

## References

- [ArgoCD Official Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)
- [Helm Charts Documentation](https://helm.sh/docs/topics/charts/)
