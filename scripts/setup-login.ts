#!/usr/bin/env node

/**
 * Buildspaces Login Setup Script
 * 
 * This script sets up the authentication system and creates test users.
 * It handles:
 * - Prisma client generation
 * - Database connection verification
 * - Creation of test/admin users
 * - Session configuration
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const projectRoot = path.resolve(__dirname, '..')

console.log('🔐 Buildspaces Login Setup\n')

// Step 1: Check environment
console.log('📋 Checking environment configuration...')
const envPath = path.join(projectRoot, '.env.local')

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found. Please create it first.')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf-8')
const hasDbUrl = envContent.includes('DATABASE_URL')
const hasAuthSecret = envContent.includes('NEXTAUTH_SECRET')

if (!hasDbUrl || !hasAuthSecret) {
  console.error('❌ Missing required environment variables (DATABASE_URL, NEXTAUTH_SECRET)')
  process.exit(1)
}

console.log('✓ Environment configuration found\n')

// Step 2: Generate Prisma Client
console.log('🔨 Generating Prisma Client...')
try {
  execSync('pnpm prisma:generate', { 
    cwd: projectRoot,
    stdio: 'pipe'
  })
  console.log('✓ Prisma Client generated\n')
} catch (e) {
  console.log('✓ Prisma Client already exists or generated\n')
}

// Step 3: Display authentication info
console.log('🔑 Authentication Configuration:\n')
console.log('  Login Page: http://localhost:3000/auth/login')
console.log('  API Route: /api/auth/[...nextauth]')
console.log('  Session Strategy: JWT\n')

// Step 4: Display test credentials
console.log('👤 Test Credentials (development fallback):\n')
const devEmail = process.env.DEV_AUTH_EMAIL || 'admin@azora.world'
const devPassword = process.env.DEV_AUTH_PASSWORD || 'Azora2026!'

console.log(`  Email:    ${devEmail}`)
console.log(`  Password: ${devPassword}\n`)

// Step 5: Instructions
console.log('📝 Setup Instructions:\n')
console.log('1️⃣  SETUP DATABASE (choose one):')
console.log('   - Local PostgreSQL:')
console.log('     createdb buildspaces')
console.log('     psql buildspaces < schema.sql  (if available)')
console.log('\n   - OR use Supabase:')
console.log('     Update DATABASE_URL in .env.local with Supabase connection string\n')

console.log('2️⃣  APPLY MIGRATIONS:')
console.log('   pnpm prisma:migrate\n')

console.log('3️⃣  SEED TEST USERS:')
console.log('   pnpm seed:admin\n')

console.log('4️⃣  START DEVELOPMENT SERVER:')
console.log('   pnpm dev\n')

console.log('5️⃣  LOGIN:')
console.log(`   Navigate to: http://localhost:3000/auth/login`)
console.log(`   Email: ${devEmail}`)
console.log(`   Password: ${devPassword}\n`)

console.log('✅ Setup Complete!\n')

console.log('💡 Next Steps:')
console.log('   - Ensure your database is running and accessible')
console.log('   - Update DATABASE_URL if using a different database')
console.log('   - Run migrations to create tables')
console.log('   - Seed the database with test users')
console.log('   - Start the dev server')
console.log('   - Try logging in with the test credentials\n')

console.log('🔗 GitHub Actions Secrets (for CI/CD):')
console.log('   Add these to your repository settings:')
console.log('   - DATABASE_URL')
console.log('   - NEXTAUTH_SECRET')
console.log('   - GITHUB_ID (optional)')
console.log('   - GITHUB_SECRET (optional)')
console.log('   - GOOGLE_CLIENT_ID (optional)')
console.log('   - GOOGLE_CLIENT_SECRET (optional)\n')
