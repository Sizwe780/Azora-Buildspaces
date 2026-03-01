# Buildspaces Database Setup - Quick Start (5 Minutes)

## Current Status
✅ Prisma client generated and ready
✅ Dev server running (http://localhost:3000)
✅ All authentication infrastructure in place

⏳ **NEXT STEP:** Connect a PostgreSQL database

---

## Recommended: Use Supabase (Free, Cloud-based)

### Why Supabase?
- ✅ Free tier: 500MB storage, unlimited queries
- ✅ No local setup required
- ✅ Reliable production-grade database
- ✅ Includes backups and automatic updates
- ✅ Takes 2 minutes to set up

### Setup Steps

#### 1. Create Supabase Account (1 minute)
```bash
# Go to https://supabase.com
# Click "Sign up" 
# Choose "Sign up with GitHub" (easiest)
# Follow the prompts
```

#### 2. Create a Project (1 minute)
1. Click "New Project"
2. Fill in:
   - **Project Name:** buildspaces
   - **Password:** (Supabase will generate one, copy it)
   - **Region:** Choose closest to you
3. Click "Create new project"
4. Wait ~2 minutes for database to initialize

#### 3. Get Connection String (1 minute)
1. Go to **Settings** → **Database**
2. Find the section "Connection string" → "URI"
3. Copy the full connection string (starts with `postgresql://`)
4. It will look like:
   ```
   postgresql://postgres.[project-id]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
   ```

#### 4. Update .env.local (30 seconds)
Edit `.env.local` and replace the DATABASE_URL:
```
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public"
```

#### 5. Push Schema to Database (1 minute)
```bash
cd c:\Users\Azora Sapiens\azora-buildspaces-standalone
pnpm exec prisma db push
```

When prompted: **"Do you want to create the schema?"** → Answer: **yes**

#### 6. Seed Test User (30 seconds)
```bash
pnpm seed:admin
```

Expected output:
```
✓ Admin user created/updated
  Email: admin@azora.world
  Password: Azora2026!
```

#### 7. Test the Login (1 minute)
```bash
# Dev server should already be running at http://localhost:3000
# If not:
pnpm dev

# Then:
# 1. Navigate to http://localhost:3000/auth/login
# 2. Enter:
#    Email: admin@azora.world
#    Password: Azora2026!
# 3. Click "Sign in with Credentials"
# 4. You should be redirected to the dashboard
```

---

## Alternative: Use PostgreSQL Locally

### Option A: PostgreSQL Direct Install
```bash
# Windows: Download installer from https://www.postgresql.org/download/windows/
# During install, note the password you set
# Create database:
psql -U postgres -c "CREATE DATABASE buildspaces;"

# Update .env.local:
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/buildspaces"

# Then continue with steps 5-7 above
```

### Option B: WSL2 + PostgreSQL
```bash
# Inside WSL2 Ubuntu:
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres createdb buildspaces

# From PowerShell, update .env.local:
# DATABASE_URL="postgresql://postgres:postgres@wsl-host:5432/buildspaces"
```

---

## Troubleshooting

### Connection Error: "getaddrinfo ENOTFOUND"
- ❌ Database URL is incorrect
- ✅ Double-check connection string from Supabase
- ✅ Ensure no typos in host, port, or password

### Error: "Authentication failed"
- ❌ Username/password is wrong
- ✅ For Supabase: Use the **pool connection string** (not "Direct connection")
- ✅ Ensure password matches exactly (special characters?)

### Error: "Database does not exist"
- ❌ Database wasn't created
- ✅ For Supabase: They create it automatically, check connection string
- ✅ For local: Run `createdb buildspaces`

### "prisma db push" says "schema already exists"
- ✅ That's fine! It means tables are already there
- ✅ Continue with `pnpm seed:admin`

### Can't log in after setup
- ✅ Check .env.local has correct DATABASE_URL
- ✅ Check user was created: `pnpm prisma:studio` and look for admin@azora.world
- ✅ Verify Prisma client is generated: `pnpm prisma:generate`
- ✅ Check dev server logs for errors

---

## Verify Everything Works

Once logged in, you should see:
1. ✅ Authenticated (logged in as admin@azora.world)
2. ✅ Dashboard loads
3. ✅ Can navigate the app
4. ✅ No "Database not configured" errors

## Next Steps After Login
- Explore the dashboard
- Create test projects
- Configure OAuth providers (GitHub, Google) in `.env.local` if desired
- Deploy to production (see DEPLOYMENT.md)

---

## Need Help?

Check these files for more details:
- `DATABASE_SETUP.md` - Detailed database options and troubleshooting
- `LOGIN_SETUP.md` - Authentication architecture and advanced config
- `ENV_CONFIGURATION.ipynb` - All environment variables explained
