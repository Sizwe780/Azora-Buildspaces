# 🏗️ Azora BuildSpaces - Standalone Edition

**Status**: 🟡 Beta  
**Version**: 0.1.0  
**Platform**: Web (Next.js 16 with React 19)  
**Repository**: Standalone (separated from Azora monorepo)

---

## 📋 What is BuildSpaces (Standalone)?

This is an **independent, standalone version** of Azora BuildSpaces extracted from the main Azora monorepo. It contains all necessary code, configuration, and dependencies to run BuildSpaces as a completely separate application.

### Key Changes from Monorepo Version

- ✅ **No Monorepo Dependencies**: Removed all references to `@azora/*` packages
- ✅ **Self-Contained Prisma**: Database schema is local to this repository
- ✅ **Simplified Package.json**: Removed workspace references, all dependencies are npm packages
- ✅ **Standalone Scripts**: Setup and verification scripts work independently
- ✅ **Complete Copy**: All app code, tests, and configuration included

---

## 🎯 BuildSpaces Overview

BuildSpaces is an AI-powered collaborative development workbench that provides developers with specialized "rooms" for different aspects of software development:

### 10 Fully Implemented Rooms ✅

1. **Code Chamber** - Monaco-based code editor with WebContainer execution
2. **Spec Chamber** - AI-powered specification and code generation
3. **Design Studio** - Figma integration and design-to-code conversion
4. **AI Studio** - Jupyter-like notebook environment for ML/data science
5. **Command Desk** - Central AI command center with natural language
6. **Maker Lab** - Database designer and API generator
7. **Collaboration Pod** - Real-time collaborative editing with Yjs
8. **Knowledge Ocean** - Intelligent code search and documentation
9. **Innovation Theater** - Project showcase and presentation
10. **Collectible Showcase** - NFT minting and display

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 14+ (or use Supabase/Neon)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and set:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/buildspaces
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Generate Prisma client**:
   ```bash
   pnpm prisma:generate
   ```

4. **Run migrations**:
   ```bash
   pnpm prisma:migrate
   ```

5. **Start development server**:
   ```bash
   pnpm dev
   ```

6. **Access the app**:
   - BuildSpaces: `http://localhost:3000`
   - Health check: `http://localhost:3000/api/health`

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

---

## 🐳 Docker Deployment

```bash
# Build image
docker build -t azora-buildspaces:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="your-secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  azora-buildspaces:latest
```

---

## ☸️ Kubernetes Deployment

```bash
kubectl apply -f k8s/buildspaces-deployment.yaml
kubectl apply -f k8s/buildspaces-service.yaml
kubectl apply -f k8s/buildspaces-ingress.yaml
```

---

## 📁 Project Structure

```
azora-buildspaces-standalone/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   ├── (dashboard)/              # Dashboard layout
│   └── (auth)/                   # Auth layout
├── lib/                          # Business logic
│   ├── database/                 # Prisma client
│   ├── auth/                     # Authentication
│   ├── agents/                   # AI agents
│   ├── services/                 # External services
│   └── ...
├── components/                   # React components
├── tests/                        # Test files
├── scripts/                      # Utility scripts
├── public/                       # Static assets
├── styles/                       # Global styles
├── prisma/                       # Database schema
├── k8s/                          # Kubernetes manifests
├── Dockerfile                    # Docker build
├── package.json                  # Dependencies
├── next.config.mjs              # Next.js config
├── tsconfig.json                # TypeScript config
└── README.md                     # This file
```

---

## 🔐 Security Features

- ✅ HTTPS Enforcement (HSTS headers)
- ✅ Content Security Policy (CSP)
- ✅ Input Validation (Zod)
- ✅ SQL Injection Prevention (Prisma)
- ✅ Code Sandboxing (WebContainer)
- ✅ Constitutional AI Validation

---

## 🛠️ Environment Variables

### Essential

```env
DATABASE_URL=postgresql://user:password@localhost:5432/buildspaces
NEXTAUTH_SECRET=<32-char-random-string>
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Optional

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
FIGMA_TOKEN=figd_...
GITHUB_TOKEN=ghp_...
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...@sentry.io/...
```

See `.env.example` for complete list.

---

## 📊 API Endpoints

- `/api/auth/*` - Authentication
- `/api/health` - Health check
- `/api/agents/*` - AI agents
- `/api/buildspaces/*` - Project management
- `/api/chat/*` - Command Desk
- `/api/design/*` - Design Studio
- `/api/knowledge/*` - Knowledge Ocean
- `/api/fs/*` - File system
- `/api/notebook/*` - AI Studio
- `/api/maker-lab/*` - Database designer
- `/api/economy/*` - Token economy

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
vercel --prod
```

Set environment variables in Vercel dashboard.

### Docker + Any Host

```bash
docker build -t buildspaces .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="..." \
  buildspaces:latest
```

---

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Code Organization](./CODE_ORGANIZATION.md) - Codebase structure
- [API Documentation](./README.md#api-endpoints) - Endpoint reference

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Write/update tests
4. Ensure all tests pass: `pnpm test`
5. Commit and push
6. Create pull request

---

## 📄 License

Proprietary - Azora ES (Pty) Ltd

---

## 🔗 Related Links

- **Original Monorepo**: Azora OS (github.com/Azora-OS/azora)
- **Documentation**: See root README.md for comprehensive guides
- **Issues**: Report issues in the standalone repository

---

**Status**: 🟡 Beta / Ready for Development  
**Last Updated**: February 28, 2026

Built with Ubuntu Philosophy 💚  
_"I am because we are"_
