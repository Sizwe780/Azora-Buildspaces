# Neon PostgreSQL Setup for BuildSpaces

This document covers the Neon PostgreSQL integration with BuildSpaces using Prisma v7.

## Overview

BuildSpaces now uses **Neon**, a serverless PostgreSQL database hosting service, for production data storage. The setup uses:

- **Database**: Neon PostgreSQL
- **ORM**: Prisma v7 with PostgreSQL adapter  
- **Connection Pooling**: PrismaClient with pg driver
- **Connection String**: Uses `DATABASE_URL` environment variable

## Connection Details

- **Connection String**: `postgresql://neondb_owner:npg_gLD2S8NTdcyr@ep-falling-king-aim2799b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Pool Size**: 20 concurrent connections (configurable in `lib/database/client.ts`)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 10 seconds

## Prerequisites

1. **Node.js**: v18+ (with npm/pnpm)
2. **Prisma**: v7.2.0+ (for PostgreSQL adapter support)
3. **pg Driver**: Installed in dependencies

## Setup Steps

### 1. Environment Configuration

The `.env.local` file is pre-configured with the Neon connection string:

```bash
# .env.local
DATABASE_URL=postgresql://neondb_owner:npg_gLD2S8NTdcyr@ep-falling-king-aim2799b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://neondb_owner:npg_gLD2S8NTdcyr@ep-falling-king-aim2799b.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Note**: `DIRECT_URL` is used for migrations (direct connection without pooling)

### 2. Generate Prisma Client

```bash
# Generate the Prisma client
npx prisma generate

# Output:
# ✔ Generated Prisma Client (v7.2.0) to ./node_modules/@prisma/client in 409ms
```

### 3. Push Schema to Database (First Time Only)

If using migrations:

```bash
# Push schema to Neon
npx prisma db push

# Or use migrations
npx prisma migrate deploy
```

### 4. Test Connection

```bash
# Test the Neon connection
npx ts-node lib/database/test-neon.ts

# Output:
# 🔍 Testing Neon PostgreSQL Connection...
# Database Configuration Status:
#   ✓ DATABASE_URL configured: true
#   ✓ Prisma client generated: true
#   ✓ Database connected: true
#   ℹ Message: Database connected successfully
# ✅ Neon connection test PASSED!
```

## Using Prisma in Your Code

### Import the Prisma Client

```typescript
import { prisma } from '@/lib/database/client'
```

### Example Queries

```typescript
// Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
  },
})

// Find users
const users = await prisma.user.findMany()

// Update a user
const updated = await prisma.user.update({
  where: { id: 'user-id' },
  data: { name: 'Jane Doe' },
})

// Delete a user
await prisma.user.delete({
  where: { id: 'user-id' },
})
```

### Check Database Status

```typescript
import { getDatabaseStatus, PRISMA_AVAILABLE } from '@/lib/database/client'

// Check if database is configured
if (PRISMA_AVAILABLE) {
  // Use database features
  const status = await getDatabaseStatus()
  console.log('Database connected:', status.connected)
}
```

## Database Schema

The Prisma schema is defined in `prisma/schema.prisma`. Key models include:

- **User**: User accounts and profiles
- **Enrollment**: Course enrollments
- **Payment**: Payment transactions
- **Token**: Authentication tokens
- **Wallet**: Web3 wallet information
- **MiningActivity**: Economy/mining operations
- **And more...**

## Troubleshooting

### Connection Refused

**Error**: `ECONNREFUSED: Connection refused`

**Solution**:
1. Check Neon console - ensure project is active
2. Verify CONNECTION_URL in `.env.local`
3. Check Neon connection limit hasn't been reached
4. Wait 30 seconds and retry

### Authentication Failed

**Error**: `authentication failed for user "neondb_owner"`

**Solution**:
1. Verify credentials in CONNECTION_URL
2. Reset Neon password in Neon console
3. Update `.env.local` with new credentials

### Migration Issues

**Error**: `Error: Migration pending`

**Solution**:
```bash
# Resolve migrations
npx prisma migrate resolve --rolled-back <migration_name>
# Or reset (WARNING: deletes all data)
npx prisma migrate reset
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**: 
1. Change port in `.env.local`
2. Or kill process using the port

## Performance Optimization

### Connection Pooling

The client implements connection pooling:
- **Max Connections**: 20
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 10 seconds

Adjust in `lib/database/client.ts`:

```typescript
const pool = new Pool({
  connectionString,
  max: 20,           // Increase for high workloads
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})
```

### Query Optimization

Always use proper Prisma patterns:

```typescript
// ✓ Good: Use select to minimize data transfer
const user = await prisma.user.findUnique({
  where: { id: 'user-id' },
  select: { id: true, email: true, name: true },
})

// ✗ Avoid: Fetching entire records when you need only some fields
const user = await prisma.user.findUnique({
  where: { id: 'user-id' },
})
```

### Caching

For frequently accessed data, consider:
1. Implementing Redis caching (already configured in `.env.local`)
2. Using Prisma's built-in caching for certain operations

## Backup and Recovery

### Manual Backup

1. Go to Neon console
2. Click "Branches" → "Main" → "Backups"
3. Click "Create backup"

### Restore from Backup

1. Go to Neon console
2. Click the backup you want to restore
3. Click "Restore branch"

### Export Data

```bash
# Export entire database to SQL
npx prisma db pull > backup.sql

# Create new migration from current schema
npx prisma migrate dev --create-only
```

## Migration Strategy

### Development

```bash
# Create and apply migrations
npx prisma migrate dev --name add_new_field

# Push changes without migrations
npx prisma db push
```

### Production

```bash
# Deploy migrations only
npx prisma migrate deploy

# Verify status
npx prisma migrate status
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` - it contains credentials
2. **Connection String**: Keep `DATABASE_URL` secret
3. **Direct URL**: Use only for migrations, never in production code
4. **SSL/TLS**: Neon connection requires SSL (`sslmode=require`)
5. **Channel Binding**: Enabled (`channel_binding=require`) for additional security

## Monitoring

Monitor your Neon database via:

1. **Neon Console**: https://console.neon.tech
2. **Database Logs**: Check Neon console for query logs
3. **Connection Status**: Use `getDatabaseStatus()` function
4. **Metrics**: Monitor CPU, storage, and connection count in Neon dashboard

## Additional Resources

- [Neon Documentation](https://neon.tech/docs/introduction)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [BuildSpaces Database Configuration](./client.ts)

## Support

For issues or questions:

1. Check Neon console for connection/quota issues
2. Review Prisma error messages - they're usually descriptive
3. Use `test-neon.ts` script to diagnose connection problems
4. Check logs in `lib/database/client.ts` for detailed errors

---

Last Updated: March 7, 2026
