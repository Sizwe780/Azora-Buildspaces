# Database Setup Guide for Buildspaces

## Quick Setup Options

### Option 1: Supabase (Recommended - Free, Cloud-based)

Supabase provides a free PostgreSQL database in the cloud with 500MB storage and unlimited queries.

**Steps:**
1. Go to https://supabase.com and sign up (free)
2. Create a new project
3. In the dashboard, go to "Settings" → "Database"
4. Copy the connection string (looks like: `postgresql://postgres.[project-id]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`)
5. Update `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public"
   ```
6. Run: `pnpm prisma:generate`
7. Run: `pnpm exec prisma db push`
8. Run: `pnpm seed:admin`
9. Start dev server: `pnpm dev`

### Option 2: Railway (Free Trial, Very Simple)

Railway provides free $5/month credits for databases.

**Steps:**
1. Go to https://railway.app and sign up (free with GitHub)
2. Create a new PostgreSQL database
3. Copy the connection string from the "Connect" tab
4. Update `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:password@host:5432/railway"
   ```
5. Follow steps 6-9 from Option 1

### Option 3: Local PostgreSQL (Windows)

**Option A: Install PostgreSQL directly**
- Download from https://www.postgresql.org/download/windows/
- Install with default settings (username: postgres, password: postgres)
- During installation, create database `buildspaces`
- Connection string: `postgresql://postgres:postgres@localhost:5432/buildspaces`

**Option B: WSL2 + PostgreSQL**
- Install Ubuntu on WSL2
- Run: `sudo apt-get install postgresql postgresql-contrib`
- Start service: `sudo service postgresql start`
- Create database: `sudo -u postgres createdb buildspaces`
- Update .env.local with appropriate connection string

### Option 4: Docker (Requires Docker Desktop)

If Docker Desktop is installed, create a `docker-compose.yml` in the project root and run:
```bash
docker-compose up -d
```

This will start a PostgreSQL database at `postgresql://postgres:postgres@localhost:5432/buildspaces`

## After Database Setup

Once you have a database connection:

1. **Generate Prisma Client:**
   ```bash
   pnpm prisma:generate
   ```

2. **Push Schema to Database:**
   ```bash
   pnpm exec prisma db push
   ```

3. **Create Test User:**
   ```bash
   pnpm seed:admin
   ```
   This creates a user:
   - Email: admin@azora.world
   - Password: Azora2026!

4. **Start Dev Server:**
   ```bash
   pnpm dev
   ```
   Dev server will be available at http://localhost:3000

5. **Test Login:**
   - Navigate to http://localhost:3000/auth/login
   - Use credentials above to sign in
   - You should be redirected to the dashboard

## Troubleshooting

**"Connection refused"**
- Ensure your database is actually running
- For Supabase/Railway: Check your connection string is correct
- For local: Verify PostgreSQL service is running

**"Database does not exist"**
- For Supabase/Railway: Database is created automatically
- For local: Create it with: `createdb buildspaces` (Linux/Mac) or pgAdmin (Windows)

**"Authentication failed"**
- Double-check username and password in connection string
- For Supabase: Ensure you're using the pool connection string, not direct connection

**Prisma Client not found**
- Run: `pnpm prisma:generate`

**Tables missing**
- Run: `pnpm exec prisma db push`

## Development with Prisma Studio

Once database is set up, you can inspect/edit data with:
```bash
pnpm prisma:studio
```

This opens a GUI at http://localhost:5555 where you can view all tables and records.
