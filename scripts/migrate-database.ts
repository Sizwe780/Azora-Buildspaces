import { execSync } from 'child_process'

console.log('[MIGRATE] Starting database migration...')
console.log('[MIGRATE] DATABASE_URL configured:', Boolean(process.env.DATABASE_URL))

if (!process.env.DATABASE_URL) {
  console.error('[MIGRATE] ERROR: DATABASE_URL is not set')
  process.exit(1)
}

// Generate Prisma client first
console.log('[MIGRATE] Generating Prisma client...')
execSync('npx prisma generate', { stdio: 'inherit', cwd: '/vercel/share/v0-project' })
console.log('[MIGRATE] Prisma client generated successfully')

// Push schema to database (creates all tables)
console.log('[MIGRATE] Pushing schema to database...')
execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: '/vercel/share/v0-project' })
console.log('[MIGRATE] Schema pushed successfully - all tables created!')
