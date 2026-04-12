/**
 * Admin User Seed Script
 * 
 * Creates the admin user with properly hashed password for authentication.
 * Run with: pnpm tsx scripts/seed-admin.ts
 */

import { neon } from '@neondatabase/serverless'
import crypto from 'crypto'

// Password hashing function (matches lib/auth/utils.ts)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function seedAdminUser() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('[SEED] DATABASE_URL is not set')
    process.exit(1)
  }

  console.log('[SEED] Connecting to database...')
  const sql = neon(databaseUrl)

  // Admin credentials from environment or defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@azora.world'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Azora2026!'
  const adminName = 'Azora Admin'

  // Demo user credentials
  const demoEmail = 'demo@azora.world'
  const demoPassword = 'demo123456'
  const demoName = 'Demo User'

  try {
    // Hash passwords
    console.log('[SEED] Hashing passwords...')
    const adminPasswordHash = hashPassword(adminPassword)
    const demoPasswordHash = hashPassword(demoPassword)

    // Delete existing users if they exist
    console.log('[SEED] Removing existing admin/demo users if present...')
    await sql`DELETE FROM users WHERE email = ${adminEmail}`
    await sql`DELETE FROM users WHERE email = ${demoEmail}`

    // Generate unique IDs
    const adminId = `admin-${crypto.randomUUID()}`
    const demoId = `demo-${crypto.randomUUID()}`
    const now = new Date()

    // Insert admin user
    console.log('[SEED] Creating admin user...')
    await sql`
      INSERT INTO users (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt")
      VALUES (${adminId}, ${adminEmail}, ${adminName}, ${adminPasswordHash}, 'ADMIN', ${now}, ${now}, ${now})
    `
    console.log(`[SEED] Admin user created: ${adminEmail}`)

    // Insert demo user
    console.log('[SEED] Creating demo user...')
    await sql`
      INSERT INTO users (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt")
      VALUES (${demoId}, ${demoEmail}, ${demoName}, ${demoPasswordHash}, 'STUDENT', ${now}, ${now}, ${now})
    `
    console.log(`[SEED] Demo user created: ${demoEmail}`)

    console.log('\n[SEED] ====================================')
    console.log('[SEED] Users seeded successfully!')
    console.log('[SEED] ====================================')
    console.log(`[SEED] Admin Login: ${adminEmail} / ${adminPassword}`)
    console.log(`[SEED] Demo Login: ${demoEmail} / ${demoPassword}`)
    console.log('[SEED] ====================================\n')

  } catch (error) {
    console.error('[SEED] Error seeding users:', error)
    process.exit(1)
  }
}

// Run the seeder
seedAdminUser()
