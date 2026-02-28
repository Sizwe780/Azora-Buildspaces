# BuildSpaces Standalone - Quick Start Guide

**Created**: February 28, 2026  
**Version**: 0.1.0  
**Type**: Complete Standalone Repository

---

## 📦 What You Have

You now have a **complete, standalone copy** of Azora BuildSpaces that includes:

✅ All application code (app/, lib/, components/)  
✅ All tests (tests/ - 197 passing tests)  
✅ Full database schema (prisma/)  
✅ All configuration files (Next.js, TypeScript, ESLint, Jest)  
✅ Deployment configurations (Docker, Kubernetes, Vercel)  
✅ All documentation and guides  
✅ Production-ready setup  

---

## 🚀 5-Minute Setup

### 1. Install Dependencies
```bash
cd C:\Users\Azora Sapiens\azora-buildspaces-standalone
pnpm install
```

### 2. Configure Database
```bash
# Create .env.local from template
cp .env.example .env.local

# Edit .env.local with your database credentials
# You need:
# - DATABASE_URL (PostgreSQL connection string)
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - NEXTAUTH_URL (http://localhost:3000 for dev)
```

**Database Setup Example:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/buildspaces
NEXTAUTH_SECRET=your-32-char-random-string-here
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Generate Prisma Client
```bash
pnpm prisma:generate
```

### 4. Run Database Migrations
```bash
pnpm prisma:migrate
```

### 5. Start Development Server
```bash
pnpm dev
```

**Access the app:**
- 🌐 BuildSpaces: http://localhost:3000
- 🏥 Health Check: http://localhost:3000/api/health
- 📊 Metrics: http://localhost:3000/api/metrics

---

## 🗄️ Database Setup Options

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Create database
createdb buildspaces

# Update .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/buildspaces
```

### Option B: Supabase (Cloud - Recommended)
1. Go to https://supabase.com
2. Create new project
3. Copy connection string from Settings → Database
4. Update `.env.local`:
```env
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
```

### Option C: Neon (Serverless PostgreSQL)
1. Go to https://neon.tech
2. Create project
3. Copy connection string
4. Update `.env.local`:
```env
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
```

---

## ✅ Verify Setup

### Check Everything Works
```bash
# Verify Prisma client
pnpm verify:prisma

# Check environment variables
pnpm verify:env

# Run TypeScript check
pnpm type-check

# Run all tests
pnpm test
```

**Expected Output:**
```
✓ 197 tests passed
✓ 34 test suites passed
✓ Database connected
✓ All components loaded
```

---

## 🧪 Running Tests

```bash
# All tests
pnpm test

# Watch mode (auto-rerun on changes)
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests (UI tests)
pnpm test:e2e

# Specific test file
pnpm test -- auth.test.ts
```

---

## 🐳 Docker Setup

### Build Docker Image
```bash
docker build -t buildspaces:latest .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  buildspaces:latest
```

### Docker Compose
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: buildspaces
    ports:
      - "5432:5432"
    
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/buildspaces
      NEXTAUTH_SECRET: your-secret
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      - db
```

Run with:
```bash
docker-compose up
```

---

## ☸️ Kubernetes Deployment

### 1. Update Kubernetes Manifests
Edit `k8s/buildspaces-deployment.yaml`:
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: buildspaces-secrets
        key: database-url
```

### 2. Create Secrets
```bash
kubectl create secret generic buildspaces-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=nextauth-secret="your-secret" \
  -n buildspaces
```

### 3. Deploy
```bash
kubectl apply -f k8s/buildspaces-namespace.yaml
kubectl apply -f k8s/buildspaces-deployment.yaml
kubectl apply -f k8s/buildspaces-service.yaml
kubectl apply -f k8s/buildspaces-ingress.yaml
```

### 4. Verify Deployment
```bash
kubectl get pods -n buildspaces
kubectl logs -n buildspaces <pod-name>
```

---

## 🚢 Production Deployment

### Option 1: Vercel (Easiest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables in dashboard
```

### Option 2: Any Cloud Provider
```bash
# Build the app
pnpm build

# Start server
pnpm start

# Set environment variables on your platform
```

---

## 🔑 Environment Variables Reference

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key (32+ chars, random)
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)

### Optional (Recommended)
- `OPENAI_API_KEY` - For AI features (sk-...)
- `FIGMA_TOKEN` - For Design Studio (figd_...)
- `REDIS_URL` - For caching (redis://...)

### Full List
See `.env.example` for all available variables.

---

## 📁 Project Structure

```
azora-buildspaces-standalone/
├── /app                    # Next.js routes and pages
├── /lib                    # Business logic and utilities
├── /components             # React components (UI)
├── /tests                  # Test files (197 tests)
├── /scripts                # Setup and utility scripts
├── /prisma                 # Database schema
├── /public                 # Static assets
├── /k8s                    # Kubernetes manifests
├── Dockerfile              # Docker build
├── package.json            # Dependencies
├── next.config.mjs         # Next.js config
├── tsconfig.json           # TypeScript config
├── jest.config.js          # Jest config
└── README.md               # Full documentation
```

---

## 🛠️ Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm lint                   # Run ESLint
pnpm type-check            # TypeScript check

# Testing
pnpm test                   # Run tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report

# Database
pnpm prisma:generate       # Generate Prisma client
pnpm prisma:migrate        # Run migrations
pnpm prisma:studio         # Open Prisma Studio

# Build
pnpm build                 # Build for production
pnpm start                 # Start production server

# Setup & Verification
pnpm setup                 # Run setup wizard
pnpm verify:prisma         # Verify Prisma setup
pnpm verify:env            # Check environment vars
```

---

## 🔐 Security Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (32+ random characters)
- [ ] Use HTTPS in production (enable in `vercel.json`)
- [ ] Set `NODE_ENV=production` in production
- [ ] Use environment variables for all secrets
- [ ] Enable database connection encryption
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Review security headers in `next.config.mjs`

---

## 🚨 Troubleshooting

### Port 3000 Already in Use
```bash
# Use different port
PORT=3001 pnpm dev

# Or kill process using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Database Connection Failed
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Verify PostgreSQL is running
pg_isready
```

### Prisma Client Not Generated
```bash
# Regenerate
pnpm prisma:generate

# Clear cache
rm -rf node_modules/.prisma

# Reinstall
pnpm install
```

### Build Fails
```bash
# Clean build
rm -rf .next
pnpm build

# Check for type errors
pnpm type-check
```

---

## 📚 Documentation

- **Full Setup**: See [README.md](./README.md)
- **Code Organization**: See [CODE_ORGANIZATION.md](./CODE_ORGANIZATION.md)
- **Extraction Details**: See [EXTRACTION_MANIFEST.md](./EXTRACTION_MANIFEST.md)
- **Original Guide**: See [STANDALONE_README.md](./STANDALONE_README.md)

---

## 🤝 Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Setup database: Configure `.env.local` and run migrations
3. ✅ Start dev server: `pnpm dev`
4. ✅ Run tests: `pnpm test` (should see 197 passing tests)
5. ✅ Explore the app: Visit http://localhost:3000
6. ✅ Try each room: Code Chamber, Spec Chamber, Design Studio, etc.
7. ✅ Review code: Explore `/app`, `/lib`, `/components`
8. ✅ Deploy: Choose Docker, Vercel, or Kubernetes

---

## 📞 Support Resources

- **GitHub Issues**: Report bugs in this repository
- **Documentation**: Read all .md files in root
- **Original Repo**: Azora OS (github.com/Azora-OS/azora)
- **Tests**: Run `pnpm test` to verify everything works

---

**Status**: 🟢 Ready to Use  
**Last Updated**: February 28, 2026  
**Test Status**: ✅ All 197 tests passing

Happy coding! 🚀
