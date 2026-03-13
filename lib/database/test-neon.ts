/**
 * Test script to verify Neon PostgreSQL connection
 * Run with: NODE_ENV=development node -r ts-node/register lib/database/test-neon.ts
 * Or: npx ts-node lib/database/test-neon.ts
 */

import { getDatabaseStatus, prisma } from './client'

async function testNeonConnection() {
  console.log('🔍 Testing Neon PostgreSQL Connection...\n')

  try {
    // Get database status
    const status = await getDatabaseStatus()
    
    console.log('Database Configuration Status:')
    console.log(`  ✓ DATABASE_URL configured: ${status.configured}`)
    console.log(`  ✓ Prisma client generated: ${status.clientGenerated}`)
    console.log(`  ✓ Database connected: ${status.connected}`)
    console.log(`  ℹ Message: ${status.message}\n`)

    if (status.error) {
      console.error(`  ✗ Error: ${status.error}\n`)
      return false
    }

    // Try a simple query
    console.log('Attempting to query database...')
    const userCount = await prisma.user.count()
    console.log(`  ✓ User count: ${userCount}`)

    console.log('\n✅ Neon connection test PASSED!')
    console.log('Your database is ready to use with Prisma.\n')

    // Show example of how to use
    console.log('Example Prisma queries:')
    console.log('  import { prisma } from "@/lib/database/client"')
    console.log('  const users = await prisma.user.findMany()')
    console.log('  const user = await prisma.user.create({ data: { email, name } })\n')

    return true

  } catch (error) {
    console.error('❌ Neon connection test FAILED!')
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}\n`)
    
    console.error('Troubleshooting steps:')
    console.error('  1. Verify DATABASE_URL in .env.local')
    console.error('  2. Check Neon console for connection limits')
    console.error('  3. Ensure Neon project is active')
    console.error('  4. Run: npx prisma generate')
    console.error('  5. Run: npx prisma db push\n')
    
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
testNeonConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
