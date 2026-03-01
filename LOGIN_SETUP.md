# 🔐 Buildspaces Authentication Setup Guide

**Date**: March 1, 2026  
**Status**: ✅ Ready for Configuration  
**Version**: 0.1.0

---

## Overview

Buildspaces uses **NextAuth.js** with **Prisma** for secure authentication. This guide walks you through setting up login functionality.

### What's Included

- ✅ NextAuth.js configuration
- ✅ Prisma ORM integration
- ✅ Credentials provider (username/password)
- ✅ OAuth support (GitHub, Google - optional)
- ✅ JWT session management
- ✅ Database adapter for production

---

## Quick Start (5 Minutes)

### 1. Environment Setup

Your `.env.local` already has the required authentication variables:

```env
# Required - Already configured
NEXTAUTH_SECRET=build-spaces-dev-secret-key-minimum-32-characters-long-123456
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# Development credentials
DEV_AUTH_EMAIL=admin@azora.world
DEV_AUTH_PASSWORD=Azora2026!
```

### 2. Generate Prisma Client

```bash
# Generate TypeScript types and client
pnpm prisma:generate
```

**✓ Already done!** The Prisma client has been generated.

### 3. Database Setup (Choose One Option)

#### Option A: Local PostgreSQL (Recommended for Development)

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Start PostgreSQL service
pg_ctl -D /usr/local/var/postgres start

# Create database
createdb buildspaces

# Update .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/buildspaces"
```

#### Option B: Supabase (Cloud PostgreSQL)

```bash
# 1. Create free account at https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings → Database
# 4. Update .env.local:
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"
```

#### Option C: Railway (Easy Alternative)

```bash
# Visit https://railway.app
# Create PostgreSQL database
# Copy connection string to DATABASE_URL
```

### 4. Apply Database Migrations

```bash
# Deploy migrations to create tables
pnpm prisma:migrate
```

### 5. Seed Test Users

```bash
# Create admin user for testing
pnpm seed:admin

# This creates:
# Email: admin@azora.world
# Password: Azora2026!
```

### 6. Start Development Server

```bash
pnpm dev
```

The dev server starts at `http://localhost:3000`

### 7. Login!

1. Navigate to: **http://localhost:3000/auth/login**
2. Enter credentials:
   - **Email**: admin@azora.world
   - **Password**: Azora2026!
3. Click "Sign In"
4. You should be redirected to `/dashboard`

---

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│         User Visits Login Page                      │
│     http://localhost:3000/auth/login               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│    NextAuth Credentials Provider                    │
│  Validates email/password against database          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
         ┌─────────┴─────────┐
         │                   │
         ↓                   ↓
    ✅ Valid          ❌ Invalid
         │                   │
         ↓                   ↓
  Create JWT          Show Error
  Set Cookie          on Login Page
         │
         ↓
  Redirect to
  /dashboard
```

### File Structure

```
lib/
  auth/
    ├── config.ts          # NextAuth configuration
    ├── providers.ts       # OAuth providers setup
    ├── callbacks.ts       # JWT & session callbacks
    ├── utils.ts          # Password hashing utilities
    └── guards.ts         # Authorization guards

app/
  api/
    auth/
      ├── [...nextauth]/   # NextAuth API endpoint
      ├── login/           # Login form page
      ├── register/        # Registration endpoint
      ├── logout/          # Logout endpoint
      └── ...

prisma/
  └── schema.prisma        # Database schema (includes User table)
```

---

## Configuration Details

### NextAuth Options

Located in: `lib/auth/config.ts`

```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),      // Database adapter
  providers: buildProviders(),          // Credentials + OAuth
  session: { 
    strategy: 'jwt',                   // Use JWT sessions
    maxAge: 30 * 24 * 60 * 60,        // 30 day expiry
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: authCallbacks,            // Custom logic
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  }
}
```

### Database Schema

The `User` model includes:

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  password      String?                # Hashed password
  emailVerified DateTime?
  role          UserRole @default(STUDENT)
  
  # NextAuth fields
  accounts      Account[]
  sessions      Session[]
  
  // ... other fields
}
```

---

## Common Issues & Solutions

### ❌ "Database not configured"

**Problem**: Database URL is missing or invalid

**Solution**:
```bash
# Check .env.local has DATABASE_URL
grep DATABASE_URL .env.local

# Verify database is running
psql -U postgres -d buildspaces -c "SELECT 1;"

# Regenerate Prisma client
pnpm prisma:generate
```

### ❌ "Invalid email or password"

**Problem**: Login fails with correct credentials

**Solution**:
```bash
# Ensure user exists
pnpm seed:admin

# Check Prisma Studio
pnpm prisma:studio
# Browse to http://localhost:5555
# Look in "User" table
```

### ❌ NEXTAUTH_SECRET not set

**Problem**: JWT errors in console

**Solution**:
```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=<generated-value>
```

### ❌ Session/cookie not persisting

**Problem**: Login works but session is lost

**Solution**:
```env
# Verify these match your actual URL
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# In production, change to your domain:
# NEXTAUTH_URL=https://yourdomain.com
# NEXTAUTH_URL_INTERNAL=http://internal-url:3000
```

---

## Testing Authentication

### Manual Testing

```bash
# 1. Start dev server
pnpm dev

# 2. Open http://localhost:3000/auth/login
# 3. Test with credentials:
#    Email: admin@azora.world
#    Password: Azora2026!
```

### Automated Testing

```bash
# Run auth tests
pnpm test -- auth

# Run E2E tests with Playwright
pnpm test:e2e

# Check auth configuration
pnpm verify:auth
```

### Debug Mode

Set in `.env.local`:
```env
# Enable NextAuth debug output
DEBUG=next-auth:*

# Run with debug
NODE_ENV=development pnpm dev
```

---

## Production Deployment

### Before Going Live

1. **Generate strong NEXTAUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```

2. **Use a managed PostgreSQL service**:
   - AWS RDS
   - Supabase
   - Railway
   - Heroku Postgres

3. **Set GitHub Actions Secrets**:
   ```
   Repository Settings → Secrets and Variables → Actions
   
   Add:
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - (Optional) GITHUB_ID, GITHUB_SECRET
   - (Optional) GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   ```

4. **Update environment URLs**:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   NEXTAUTH_URL_INTERNAL=http://your-internal-url:3000
   ```

5. **Enable HTTPS**:
   - Use Vercel (auto HTTPS)
   - Use Cloudflare (free SSL)
   - Use Let's Encrypt (certbot)

### Monitoring

- Check NextAuth logs in production
- Monitor Prisma connection pool
- Alert on failed login attempts
- Track session metrics

---

## Advanced Configuration

### Adding OAuth Providers

Edit `lib/auth/providers.ts`:

```typescript
// GitHub OAuth
if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  )
}

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}
```

### Custom Session Callbacks

Edit `lib/auth/callbacks.ts` to add custom logic:

```typescript
// Add user role to JWT
async jwt({ token, user }) {
  if (user) {
    token.role = user.role
  }
  return token
}

// Add role to session
async session({ session, token }) {
  if (session.user) {
    session.user.role = token.role
  }
  return session
}
```

### Password Hashing

Uses PBKDF2 with SHA-512 (industry standard):

```typescript
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}
```

---

## Getting Help

### Documentation

- **NextAuth.js**: https://next-auth.js.org
- **Prisma**: https://www.prisma.io/docs
- **PostgreSQL**: https://www.postgresql.org/docs

### Troubleshooting Commands

```bash
# Check auth setup
pnpm verify:auth

# View database schema
pnpm prisma:studio

# Check environment
grep -E "NEXTAUTH|DATABASE" .env.local

# Run tests
pnpm test -- auth
```

### Common Commands Reference

```bash
# Setup/Initialization
pnpm prisma:generate      # Generate Prisma client
pnpm prisma:migrate       # Run database migrations
pnpm seed:admin           # Create test admin user
pnpm setup:login          # Run complete login setup

# Development
pnpm dev                  # Start dev server
pnpm test                 # Run unit tests
pnpm type-check          # TypeScript check

# Database
pnpm prisma:studio       # Open Prisma Studio GUI
pnpm prisma:migrate      # Run migrations

# Verification
pnpm verify:auth         # Test auth setup
pnpm verify:prisma       # Check Prisma client
```

---

## Next Steps

1. ✅ Prisma Client generated
2. ✅ Environment configured
3. ⏳ Set up your database (PostgreSQL recommended)
4. ⏳ Run migrations: `pnpm prisma:migrate`
5. ⏳ Seed test user: `pnpm seed:admin`
6. ⏳ Start dev server: `pnpm dev`
7. ⏳ Login at: `http://localhost:3000/auth/login`

---

**Version**: 0.1.0  
**Last Updated**: March 1, 2026  
**Status**: ✅ Ready for Use
