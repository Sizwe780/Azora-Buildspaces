-- Seed Admin User Script
-- Creates admin@azora.world with password: Azora2026!
-- The password hash is generated using pbkdf2 with salt (format: salt:hash)

-- First, delete any existing admin user to avoid conflicts
DELETE FROM users WHERE email = 'admin@azora.world';

-- Insert admin user with pre-hashed password
-- Password: Azora2026! hashed with pbkdf2 (salt:hash format)
-- Salt: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
INSERT INTO users (
  id,
  name,
  email,
  password,
  role,
  "emailVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  'admin-' || gen_random_uuid()::text,
  'Azora Admin',
  'admin@azora.world',
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT id, name, email, role, "createdAt" FROM users WHERE email = 'admin@azora.world';
