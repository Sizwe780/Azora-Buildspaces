-- Seed Admin User for Azora BuildSpaces
-- Admin credentials: admin@azora.world / Azora2026!
-- Password is hashed using pbkdf2 with salt

-- First, ensure the user doesn't already exist
DELETE FROM users WHERE email = 'admin@azora.world';

-- Insert admin user with pre-hashed password
-- The password hash below is for: Azora2026!
-- Format: salt:hash (using pbkdf2, 1000 iterations, sha512)
INSERT INTO users (
  id,
  email,
  name,
  password,
  role,
  "emailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  'admin-' || gen_random_uuid()::text,
  'admin@azora.world',
  'Azora Admin',
  -- This will be replaced by the TypeScript seeder with proper hash
  'PLACEHOLDER_HASH',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);

-- Also create demo user if needed
DELETE FROM users WHERE email = 'demo@azora.world';

INSERT INTO users (
  id,
  email,
  name,
  password,
  role,
  "emailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  'demo-' || gen_random_uuid()::text,
  'demo@azora.world',
  'Demo User',
  'PLACEHOLDER_HASH',
  'STUDENT',
  NOW(),
  NOW(),
  NOW()
);
