import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[MIGRATE] Testing Prisma client connection...')
  console.log('[MIGRATE] DATABASE_URL configured:', Boolean(process.env.DATABASE_URL))

  try {
    // Test the connection
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    console.log('[MIGRATE] Database connection successful:', result)

    // Check existing tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `
    console.log('[MIGRATE] Existing tables:', JSON.stringify(tables, null, 2))
    console.log('[MIGRATE] Total tables found:', Array.isArray(tables) ? tables.length : 0)
  } catch (error) {
    console.error('[MIGRATE] Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
