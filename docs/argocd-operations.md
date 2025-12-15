# ArgoCD Operations Guide

This guide provides step-by-step instructions for managing the ArgoCD setup for the HelloNuno application.

## Table of Contents
- [Starting ArgoCD Management](#starting-argocd-management)
- [Stopping ArgoCD Management](#stopping-argocd-management)
- [Updating the Application](#updating-the-application)
- [Reinstalling/Redeploying](#reinstallingredeploying)
- [Temporary Pause](#temporary-pause)
- [Common Operations](#common-operations)

---

## Starting ArgoCD Management

### Prerequisites
- ArgoCD installed in your Kubernetes cluster
- Git repository pushed to GitHub
- `argocd/application.yaml` file exists

### Steps to Enable ArgoCD Management

1. **Verify ArgoCD is running:**
   ```bash
   kubectl get pods -n argocd
   ```
   You should see ArgoCD pods running (application-controller, server, repo-server, etc.)

2. **If Helm release exists, uninstall it first:**
   ```bash
   # Check if Helm release exists
   helm list -n hellonuno
   
   # If it exists, uninstall it
   helm uninstall hellonuno -n hellonuno
   ```

3. **Apply the ArgoCD Application:**
   ```bash
   kubectl apply -f argocd/application.yaml
   ```

4. **Verify ArgoCD took control:**
   ```bash
   # Check application status
   kubectl get application hellonuno -n argocd
   
   # Should show: SYNC STATUS: Synced, HEALTH STATUS: Healthy
   ```

5. **Watch the deployment:**
   ```bash
   # Watch ArgoCD sync the application
   kubectl get application hellonuno -n argocd -w
   
   # In another terminal, watch pods come up
   kubectl get pods -n hellonuno -w
   ```

### Expected Output

```
NAME        SYNC STATUS   HEALTH STATUS
hellonuno   Synced        Healthy
```

---

## Stopping ArgoCD Management

### Option 1: Delete ArgoCD Application (Keeps Resources)

This removes ArgoCD management but **keeps all deployed resources running**:

```bash
# Delete the ArgoCD Application with cascade=false
kubectl delete application hellonuno -n argocd --cascade=false
```

After this:
- ✅ Pods, services, deployments remain running
- ❌ ArgoCD no longer monitors or updates them
- You can manage resources manually with `kubectl` or `helm`

### Option 2: Delete ArgoCD Application (Removes Everything)

This removes ArgoCD management **AND deletes all deployed resources**:

```bash
# Delete the ArgoCD Application (default cascade behavior)
kubectl delete application hellonuno -n argocd
```

After this:
- ❌ All pods, services, deployments are deleted
- ❌ Application completely removed from cluster

### Option 3: Disable Auto-Sync Only

Keep ArgoCD management but disable automatic syncing:

```bash
# Patch the application to disable auto-sync
kubectl patch application hellonuno -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
```

After this:
- ✅ Resources keep running
- ✅ ArgoCD still monitors for drift
- ❌ Changes in Git require manual sync

### Switching Back to Helm Management

If you want to stop using ArgoCD and go back to Helm:

```bash
# 1. Delete ArgoCD Application (keep resources)
kubectl delete application hellonuno -n argocd --cascade=false

# 2. Adopt resources into a Helm release
helm install hellonuno ./helm/hellonuno -n hellonuno --replace
```

---

## Updating the Application

### Automatic Updates (Default Behavior)

With auto-sync enabled, updates happen automatically:

1. **Make changes to Helm chart:**
   ```bash
   # Edit files in helm/hellonuno/
   vim helm/hellonuno/values.yaml
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Update backend replicas to 3"
   git push
   ```

3. **ArgoCD automatically syncs** (within 3 minutes)
   ```bash
   # Watch the sync happen
   kubectl get application hellonuno -n argocd -w
   ```

### Manual Updates

If auto-sync is disabled or you want to force immediate sync:

```bash
# Option 1: Using kubectl annotation (trigger refresh)
kubectl patch application hellonuno -n argocd --type merge \
  -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"normal"}}}'

# Option 2: Using ArgoCD CLI (if installed)
argocd app sync hellonuno

# Option 3: Delete and recreate the application
kubectl delete application hellonuno -n argocd --cascade=false
kubectl apply -f argocd/application.yaml
```

### Update Rollback

To roll back to a previous version:

```bash
# 1. Find the commit you want to roll back to
git log --oneline

# 2. Revert to that commit
git revert <commit-hash>
# OR
git reset --hard <commit-hash>

# 3. Push to trigger ArgoCD sync
git push --force  # Only if you used reset
```

---

## Reinstalling/Redeploying

### Complete Reinstall from Scratch

```bash
# 1. Delete ArgoCD Application and all resources
kubectl delete application hellonuno -n argocd

# 2. Wait for cleanup (optional: verify namespace is empty)
kubectl get all -n hellonuno

# 3. Delete namespace if you want a clean slate
kubectl delete namespace hellonuno

# 4. Reapply ArgoCD Application
kubectl apply -f argocd/application.yaml

# 5. Verify deployment
kubectl get application hellonuno -n argocd
kubectl get pods -n hellonuno
```

### Redeploy Without Deleting ArgoCD Application

```bash
# Just delete the namespace (ArgoCD will recreate everything)
kubectl delete namespace hellonuno

# ArgoCD will automatically recreate namespace and all resources
```

---

## Temporary Pause

### Suspend Automatic Syncing Temporarily

Use this when you need to test manual changes without ArgoCD reverting them:

```bash
# Disable auto-sync
kubectl patch application hellonuno -n argocd --type merge \
  -p '{"spec":{"syncPolicy":{"automated":null}}}'

# Make your manual changes
kubectl scale deployment hellonuno-backend --replicas=5 -n hellonuno

# Test your changes...

# Re-enable auto-sync when done
kubectl patch application hellonuno -n argocd --type merge \
  -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
```

### Pause All ArgoCD Syncing (All Applications)

```bash
# Scale down ArgoCD application controller
kubectl scale deployment argocd-application-controller -n argocd --replicas=0

# Resume by scaling back up
kubectl scale deployment argocd-application-controller -n argocd --replicas=1
```

---

## Common Operations

### Check Application Status

```bash
# Quick status
kubectl get application hellonuno -n argocd

# Detailed status
kubectl describe application hellonuno -n argocd

# Watch for changes
kubectl get application hellonuno -n argocd -w
```

### View Application Resources

```bash
# List all resources managed by ArgoCD
kubectl get all -n hellonuno

# Check specific resource types
kubectl get deployments -n hellonuno
kubectl get services -n hellonuno
kubectl get pods -n hellonuno
```

### Check Sync History

```bash
# View application details including sync history
kubectl get application hellonuno -n argocd -o yaml | grep -A 20 "^  history:"
```

### Force Immediate Sync

```bash
# Trigger immediate sync (don't wait 3 minutes)
kubectl annotate application hellonuno -n argocd \
  argocd.argoproj.io/refresh=normal --overwrite
```

### View ArgoCD Logs

```bash
# Application controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=100

# Repo server logs (Git sync issues)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=100
```

### Modify ArgoCD Application Configuration

```bash
# Edit the application directly in cluster
kubectl edit application hellonuno -n argocd

# Or update the file and reapply
vim argocd/application.yaml
kubectl apply -f argocd/application.yaml
```

---

## Quick Reference Commands

### Start Managing with ArgoCD
```bash
kubectl apply -f argocd/application.yaml
```

### Stop Managing (Keep Resources)
```bash
kubectl delete application hellonuno -n argocd --cascade=false
```

### Stop Managing (Delete Everything)
```bash
kubectl delete application hellonuno -n argocd
```

### Update Application (Auto)
```bash
git add . && git commit -m "Update" && git push
```

### Update Application (Manual)
```bash
kubectl annotate application hellonuno -n argocd argocd.argoproj.io/refresh=normal --overwrite
```

### Check Status
```bash
kubectl get application hellonuno -n argocd
```

### View Resources
```bash
kubectl get all -n hellonuno
```

### Disable Auto-Sync
```bash
kubectl patch application hellonuno -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'
```

### Enable Auto-Sync
```bash
kubectl patch application hellonuno -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
```

---

## Troubleshooting

### Application Stuck in "Progressing"

```bash
# Check pods
kubectl get pods -n hellonuno

# Check events
kubectl get events -n hellonuno --sort-by='.lastTimestamp'

# Check deployment status
kubectl describe deployment -n hellonuno
```

### Application Shows "OutOfSync"

```bash
# View the diff between Git and cluster
kubectl describe application hellonuno -n argocd | grep -A 50 "Status:"

# Force sync
kubectl annotate application hellonuno -n argocd argocd.argoproj.io/refresh=normal --overwrite
```

### Changes Not Syncing

```bash
# Verify Git repository is accessible
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50

# Check last sync time
kubectl get application hellonuno -n argocd -o yaml | grep "lastSyncTime"

# Force immediate sync
kubectl patch application hellonuno -n argocd --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"hard"}}}'
```

---

## Best Practices

1. **Always commit changes to Git** - Don't use `kubectl edit` on ArgoCD-managed resources
2. **Use Git tags for releases** - Tag important versions for easy rollback
3. **Test in non-production first** - Use separate ArgoCD applications for dev/staging/prod
4. **Monitor sync status** - Set up alerts for sync failures
5. **Document changes** - Use meaningful Git commit messages
6. **Keep application.yaml in Git** - Version control your ArgoCD configuration

---

## Related Documentation

- [argocd-gitops-setup.md](./argocd-gitops-setup.md) - Initial setup and GitOps concepts
- [kubernetes-troubleshooting.md](./kubernetes-troubleshooting.md) - General Kubernetes troubleshooting

---

**Last Updated:** 2025-12-15
