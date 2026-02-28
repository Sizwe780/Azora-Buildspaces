/**
 * Database Migration Script
 * 
 * Pushes the Prisma schema to Neon PostgreSQL database.
 * Uses `prisma db push` for initial setup (no migration history needed).
 */
import { execSync } from 'child_process'

async function main() {
  console.log('[MIGRATE] Starting database migration...')
  console.log('[MIGRATE] DATABASE_URL configured:', Boolean(process.env.DATABASE_URL))
  
  if (!process.env.DATABASE_URL) {
    console.error('[MIGRATE] ERROR: DATABASE_URL is not set')
    process.exit(1)
  }

  try {
    // Generate Prisma client first
    console.log('[MIGRATE] Generating Prisma client...')
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    })
    console.log('[MIGRATE] Prisma client generated successfully')

    // Push schema to database (creates all tables)
    console.log('[MIGRATE] Pushing schema to database...')
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    })
    console.log('[MIGRATE] Schema pushed successfully - all tables created')

  } catch (error: any) {
    console.error('[MIGRATE] Migration failed:', error.message)
    process.exit(1)
  }
}

main()
