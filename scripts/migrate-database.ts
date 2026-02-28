import pg from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const { Pool } = pg

async function main() {
  console.log('[MIGRATE] Starting database migration via raw SQL...')
  console.log('[MIGRATE] DATABASE_URL configured:', Boolean(process.env.DATABASE_URL))

  if (!process.env.DATABASE_URL) {
    console.error('[MIGRATE] ERROR: DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  })

  try {
    const client = await pool.connect()
    console.log('[MIGRATE] Connected to database successfully')

    const sqlPath = join('/vercel/share/v0-project/scripts', 'create-tables.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    console.log('[MIGRATE] SQL file loaded, length:', sql.length)

    console.log('[MIGRATE] Executing migration SQL...')
    await client.query(sql)
    console.log('[MIGRATE] Migration SQL executed successfully!')

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log('[MIGRATE] Tables created:', result.rows.length)
    result.rows.forEach(r => console.log('  -', r.table_name))

    // Seed subscription tier config
    console.log('[MIGRATE] Seeding subscription tiers...')
    await client.query(`
      INSERT INTO "subscription_tier_config" ("id", "tier", "name", "monthlyPrice", "annualPrice", "features", "courseLimit", "uploadLimit", "tokenMonthly", "revenueShare", "supportLevel", "description", "isActive")
      VALUES 
        (gen_random_uuid()::text, 'FREE', 'Free', 0, 0, '["5 projects", "Basic Code Chamber", "Community support", "1GB storage"]', 5, 1, 100, 0.60, 'community', 'Get started with BuildSpaces for free', true),
        (gen_random_uuid()::text, 'PRO', 'Pro', 2900, 29000, '["Unlimited projects", "AI Agent Mode", "Live Preview", "Git Integration", "Multi-cursor collaboration", "Priority support", "50GB storage", "Custom domains"]', null, null, 5000, 0.80, 'priority', 'For professional developers and teams', true),
        (gen_random_uuid()::text, 'ENTERPRISE', 'Enterprise', 9900, 99000, '["Everything in Pro", "SSO / SAML", "Dedicated support", "Custom integrations", "White-label", "Unlimited storage", "SLA guarantee", "On-premise option"]', null, null, 50000, 0.90, 'dedicated', 'For organizations that need enterprise-grade features', true)
      ON CONFLICT ("tier") DO UPDATE SET
        "name" = EXCLUDED."name",
        "monthlyPrice" = EXCLUDED."monthlyPrice",
        "annualPrice" = EXCLUDED."annualPrice",
        "features" = EXCLUDED."features",
        "tokenMonthly" = EXCLUDED."tokenMonthly",
        "revenueShare" = EXCLUDED."revenueShare",
        "supportLevel" = EXCLUDED."supportLevel",
        "description" = EXCLUDED."description"
    `)
    console.log('[MIGRATE] Subscription tiers seeded!')

    // Seed AI personalities
    console.log('[MIGRATE] Seeding AI personalities...')
    await client.query(`
      INSERT INTO "ai_personalities" ("id", "name", "role", "personality", "mood", "traits", "relationships")
      VALUES 
        (gen_random_uuid()::text, 'elara', 'Code Architect', 'Brilliant and precise about software architecture. Thinks in systems and patterns.', 'focused', '{"analytical": 0.95, "creative": 0.8, "patience": 0.9}', '{"themba": "colleague", "sankofa": "mentor"}'),
        (gen_random_uuid()::text, 'themba', 'Creative Director', 'Warm, imaginative, and inspiring. Bridges art and engineering.', 'inspired', '{"analytical": 0.7, "creative": 0.98, "patience": 0.85}', '{"elara": "colleague", "sankofa": "student"}'),
        (gen_random_uuid()::text, 'sankofa', 'Wisdom Keeper', 'Ancient wisdom meets modern technology. Guides learning journeys.', 'contemplative', '{"analytical": 0.85, "creative": 0.75, "patience": 0.99}', '{"elara": "student", "themba": "mentor"}')
      ON CONFLICT ("name") DO UPDATE SET
        "role" = EXCLUDED."role",
        "personality" = EXCLUDED."personality",
        "traits" = EXCLUDED."traits",
        "relationships" = EXCLUDED."relationships"
    `)
    console.log('[MIGRATE] AI personalities seeded!')

    client.release()
    console.log('[MIGRATE] Migration complete!')
  } catch (error) {
    console.error('[MIGRATE] Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
