# Deployment Procedures

Azora Buildspaces relies on Kubernetes for scalable orchestrations and Next.js / Node.js containers for compute.

## CI/CD Pipeline
Deployment automations are handled via GitHub Actions (`.github/workflows/main.yml`).
1.  **Branch Restrictions**: Direct pushes to `main` and `develop` are protected.
2.  **Coverage Gate**: `pnpm test:coverage` mandates >80% coverage to proceed.
3.  **Staging Deployment**: Merging to `develop` deploys the image to the Staging environment.
4.  **Production Deployment**: Merging or PRs to `main` executes emergency DB snapshots prior to rolling out pods to Production.

## Kubernetes Configurations
All definitions are located in `/k8s`.
*   `buildspaces-namespace.yaml`: Scopes the environment.
*   `buildspaces-secrets.yaml`: Managed by external secret operators (Azure/AWS).
*   `redis-deployment.yaml` & `postgres-deployment.yaml`: Stateful persistence.
*   `buildspaces-deployment.yaml`: Application pods (ReplicaSets, LoadBalancers).

### Manual Rollout
If bypassing Actions for emergency patching, establish your `kubectl` context, then:
```bash
kubectl apply -f k8s/buildspaces-namespace.yaml
kubectl apply -f k8s/buildspaces-secrets.yaml
kubectl apply -f k8s/buildspaces-deployment.yaml
kubectl rollout status deployment/buildspaces-app -n buildspaces
```
