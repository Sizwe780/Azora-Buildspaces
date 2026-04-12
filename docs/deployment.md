# Azora Buildspaces: Deployment & Operations Guide

This guide provides comprehensive instructions for deploying, scaling, and operating Azora Buildspaces in a production environment. Buildspaces uses a Next.js App Router monolith backed by PostgreSQL and (optionally) Redis, containerized via Docker and orchestrated via Kubernetes.

## 1. Architecture Overview
- **Frontend/Backend Monolith:** Next.js (Node.js runtime).
- **Database:** PostgreSQL (requires `pg_vector` extension for AI semantic features).
- **Caching/PubSub:** Redis (for real-time Collaboration Pods, rate limiting, and session caching).
- **Filesystem abstraction:** LightningFS (Browser) + Node `fs` (Server for agent context).

## 2. Docker Deployment

### Building the Image
A multi-stage `Dockerfile` is provided at the repository root. This ensures minimal image size by stripping `devDependencies`.

```bash
docker build -t azora-buildspaces:latest .
```

### Running via Docker Compose
For single-node or localized production deployments, use `docker-compose.yml`:

```bash
docker-compose up -d
```
*Note: Ensure your `.env` file is present in the same directory as the docker-compose file.*

## 3. Kubernetes (K8s) Deployment
We provide manifests in the `k8s/` directory.

### Step-by-Step K8s Setup

1. **Namespace & Secrets**
   ```bash
   kubectl apply -f k8s/buildspaces-namespace.yaml
   # Update k8s/buildspaces-secrets.yaml with base64 encoded env vars first
   kubectl apply -f k8s/buildspaces-secrets.yaml
   ```

2. **Stateful Services (PostgreSQL & Redis)**
   For production, we recommend managed services (AWS RDS, AWS ElastiCache, Supabase). If hosting in-cluster:
   ```bash
   kubectl apply -f k8s/postgres-deployment.yaml
   kubectl apply -f k8s/redis-deployment.yaml
   ```

3. **Application Deployment**
   ```bash
   kubectl apply -f k8s/buildspaces-deployment.yaml
   ```

4. **Ingress & Networking**
   ```bash
   # Ensure your ingress controller (e.g., NGINX) is installed
   kubectl apply -f k8s/buildspaces-ingress.yaml
   ```

## 4. Database Migrations in Production
Next.js should generally not run migrations on boot. Instead, run Prisma migrations as a pre-deploy hook or Init Container:

```bash
npx prisma migrate deploy
```

## 5. Observability & Monitoring
- **Logs:** Handled via custom `AuditLogger` integrated into standard output. Route these logs using FluentBit or Promtail.
- **Metrics:** A `monitoring.yaml` and `monitoring-config.yaml` is provided for Prometheus/Grafana stacks to scrape Node.js and system metrics.
- **Traces:** Configure `NEXT_PUBLIC_SENTRY_DSN` for tracing via Sentry.

## 6. Troubleshooting FAQs

**Q: Agents are failing to read workspace files in production?**
A: Check your persistent volume claims (PVCs). The Node.js application needs read/write access to the `/workspaces` mapped directory.

**Q: Real-time collaboration is lagging or disconnecting?**
A: Ensure your WebSocket proxy or Ingress is configured to support long-lived connections. `nginx.ingress.kubernetes.io/websocket-services` might be required.

**Q: NextAuth callbacks failing?**
A: Verify that `NEXTAUTH_URL` perfectly matches the public-facing domain (including `https://`).