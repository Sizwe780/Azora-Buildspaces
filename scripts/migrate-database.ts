import { execSync } from 'child_process'

const CWD = '/vercel/share/v0-project'

console.log('[MIGRATE] Starting database migration...')
console.log('[MIGRATE] DATABASE_URL configured:', Boolean(process.env.DATABASE_URL))

if (!process.env.DATABASE_URL) {
  console.error('[MIGRATE] ERROR: DATABASE_URL is not set')
  process.exit(1)
}

try {
  // Step 1: Generate Prisma client
  console.log('[MIGRATE] Step 1: Generating Prisma client...')
  const genOutput = execSync('npx prisma generate', { cwd: CWD, encoding: 'utf-8', timeout: 60000 })
  console.log('[MIGRATE] Prisma generate output:', genOutput)
  
  // Step 2: Push schema to database (creates all tables)
  console.log('[MIGRATE] Step 2: Pushing schema to database (this creates all tables)...')
  const pushOutput = execSync('npx prisma db push --accept-data-loss', { cwd: CWD, encoding: 'utf-8', timeout: 120000 })
  console.log('[MIGRATE] Prisma db push output:', pushOutput)
  
  // Step 3: Verify tables were created
  console.log('[MIGRATE] Step 3: Verifying tables...')
  const { PrismaClient } = await import('/vercel/share/v0-project/node_modules/.prisma/client/default.js')
  const prisma = new PrismaClient()
  
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
  console.log('[MIGRATE] Tables created:', JSON.stringify(tables, null, 2))
  console.log('[MIGRATE] Total tables:', Array.isArray(tables) ? tables.length : 0)
  
  await prisma.$disconnect()
  console.log('[MIGRATE] Migration complete!')
} catch (error) {
  console.error('[MIGRATE] Error:', error)
  process.exit(1)
}
