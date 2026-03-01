const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_gLD2S8NTdcyr@ep-falling-king-aim2799b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({ connectionString });

(async () => {
  try {
    await client.connect();
    console.log('Connected to Neon database');
    
    // Drop all tables
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `);
    console.log('✓ Database reset complete');
    
    await client.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
