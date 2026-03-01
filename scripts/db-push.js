#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const prisma = spawn('prisma', ['db', 'push'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
  },
});

prisma.on('exit', (code) => {
  process.exit(code);
});
