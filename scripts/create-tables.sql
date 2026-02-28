-- Buildspaces Full Database Migration
-- Creates all tables from Prisma schema using raw SQL

-- Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'SUCCEEDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TokenType" AS ENUM ('ACCESS', 'REFRESH', 'RESET_PASSWORD');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "IncidentType" AS ENUM ('CRIME', 'ACCIDENT', 'EMERGENCY', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SeverityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'MINING_REWARD', 'PAYMENT', 'REFUND', 'CREDIT', 'DEBIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "MiningType" AS ENUM ('COURSE_COMPLETION', 'ASSESSMENT_PASS', 'PEER_TEACHING', 'CONTENT_CREATION', 'COMMUNITY_CONTRIBUTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "MiningStatus" AS ENUM ('PENDING', 'VERIFIED', 'REWARDED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'FILLED', 'CLOSED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "AssessmentType" AS ENUM ('QUIZ', 'EXAM', 'ASSIGNMENT', 'PROJECT', 'SKILL_TEST');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TokenTransactionType" AS ENUM ('EARN', 'REDEEM', 'TRANSFER', 'BONUS', 'PENALTY');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "LeaderboardType" AS ENUM ('GLOBAL', 'FRIENDS', 'CLASS');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TokenRedemptionType" AS ENUM ('FEATURE_UNLOCK', 'PREMIUM_CONTENT', 'MERCHANDISE', 'DONATION');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "TokenRedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "EnterpriseTier" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "EnterpriseStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CustomizationType" AS ENUM ('BRANDING', 'DOMAIN', 'SSO', 'API', 'FEATURE', 'INTEGRATION');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('COURSE_UPDATE', 'PAYMENT_SUCCESS', 'MINING_REWARD', 'JOB_MATCH', 'APPLICATION_UPDATE', 'SYSTEM_ALERT', 'AI_FAMILY_INTERACTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BurnTransactionType" AS ENUM ('COURSE_SALE', 'EARNINGS_WITHDRAWAL', 'TOKEN_REDEMPTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BlockchainStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RevenueSource" AS ENUM ('course_sale', 'subscription', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "BuyOrderStatus" AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "QueryComplexity" AS ENUM ('SIMPLE', 'MODERATE', 'COMPLEX');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "RoutingTier" AS ENUM ('LOCAL_LLM', 'RAP_SYSTEM', 'EXTERNAL_LLM');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "CitadelTransactionType" AS ENUM ('COLLECTION', 'SCHOLARSHIP', 'GRANT', 'PUBLIC_GOOD');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM ('ENROLLMENT', 'SUBSCRIPTION', 'DONATION', 'REFUND');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "users"("createdAt");

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "bio" TEXT,
  "avatar" TEXT,
  "location" TEXT,
  "timezone" TEXT,
  "preferences" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_userId_key" ON "user_profiles"("userId");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

CREATE TABLE IF NOT EXISTS "verificationtokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verificationtokens_token_key" ON "verificationtokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

CREATE TABLE IF NOT EXISTS "courses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "instructorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" "CourseLevel" NOT NULL DEFAULT 'BEGINNER',
  "duration" INTEGER NOT NULL,
  "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "thumbnail" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "courses_instructorId_idx" ON "courses"("instructorId");
CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses"("status");
CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses"("category");

CREATE TABLE IF NOT EXISTS "course_reviews" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_reviews_courseId_userId_key" ON "course_reviews"("courseId", "userId");

CREATE TABLE IF NOT EXISTS "course_purchases" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentId" TEXT,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_purchases_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "course_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "course_purchases_courseId_userId_key" ON "course_purchases"("courseId", "userId");

CREATE TABLE IF NOT EXISTS "instructor_earnings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paidEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastPaidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instructor_earnings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "instructor_earnings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "instructor_earnings_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "instructor_earnings_courseId_instructorId_key" ON "instructor_earnings"("courseId", "instructorId");

CREATE TABLE IF NOT EXISTS "course_modules" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "enrollments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_userId_courseId_key" ON "enrollments"("userId", "courseId");

CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "stripePaymentIntentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethodId" TEXT,
  "courseId" TEXT,
  "subscriptionTierId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "idempotencyKey" TEXT NOT NULL,
  "receiptId" TEXT,
  "refundedAmount" INTEGER,
  "refundReason" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "payments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "paymentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "items" JSONB NOT NULL,
  "pdfUrl" TEXT NOT NULL,
  "emailSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE,
  CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_paymentId_key" ON "receipts"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_invoiceNumber_key" ON "receipts"("invoiceNumber");

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "key" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentResult" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "idempotency_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "idempotency_keys"("key");

CREATE TABLE IF NOT EXISTS "tokens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" "TokenType" NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tokens_token_key" ON "tokens"("token");

CREATE TABLE IF NOT EXISTS "figma_frames" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "figmaId" TEXT,
  "name" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "components" JSONB,
  "raw" JSONB NOT NULL,
  "importedBy" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "figma_frames_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "figma_frames_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "collectibles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "power" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "achievements" TEXT[] DEFAULT '{}',
  "rarity" DOUBLE PRECISION NOT NULL,
  "image" TEXT NOT NULL,
  "minted" BOOLEAN NOT NULL DEFAULT false,
  "ownerId" TEXT,
  "transaction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collectibles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collectibles_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "safety_incidents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" "IncidentType" NOT NULL,
  "severity" "SeverityLevel" NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "description" TEXT NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "paymentId" TEXT NOT NULL,
  "stripeRefundId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "reason" TEXT,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "refunds_stripeRefundId_key" ON "refunds"("stripeRefundId");

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_stripeEventId_key" ON "webhook_events"("stripeEventId");

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eventType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "resource" TEXT,
  "action" TEXT,
  "details" JSONB,
  "constitutionalAlignment" DOUBLE PRECISION,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error" TEXT,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Financial tables
CREATE TABLE IF NOT EXISTS "wallets" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "address" TEXT NOT NULL,
  "truthScore" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_address_key" ON "wallets"("address");
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_userId_currency_key" ON "wallets"("userId", "currency");

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "walletId" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "description" TEXT NOT NULL,
  "fromAddress" TEXT,
  "toAddress" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "mining_activities" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "activityType" "MiningType" NOT NULL,
  "tokensEarned" DECIMAL(20,8) NOT NULL,
  "metadata" JSONB,
  "status" "MiningStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "mining_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mining_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Marketplace
CREATE TABLE IF NOT EXISTS "jobs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT,
  "remote" BOOLEAN NOT NULL DEFAULT false,
  "salary" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
  "requirements" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "skills" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key" ON "skills"("name");

CREATE TABLE IF NOT EXISTS "job_applications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "coverLetter" TEXT,
  "resume" TEXT,
  "matchScore" DOUBLE PRECISION,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_applications_userId_jobId_key" ON "job_applications"("userId", "jobId");

CREATE TABLE IF NOT EXISTS "user_skills" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "level" "SkillLevel" NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "endorsements" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_skills_userId_skillId_key" ON "user_skills"("userId", "skillId");

CREATE TABLE IF NOT EXISTS "job_skills" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "level" "SkillLevel" NOT NULL,
  CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_skills_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "job_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_skills_jobId_skillId_key" ON "job_skills"("jobId", "skillId");

-- Education
CREATE TABLE IF NOT EXISTS "assessments" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "type" "AssessmentType" NOT NULL,
  "title" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "answers" JSONB,
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION NOT NULL,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "learning_paths" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "difficulty" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "courses" JSONB NOT NULL,
  "skills" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "curriculum_edges" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "predecessorId" TEXT NOT NULL,
  "successorId" TEXT NOT NULL,
  "prerequisite" BOOLEAN NOT NULL DEFAULT true,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "description" TEXT,
  "evidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "curriculum_edges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curriculum_edges_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "skills"("id") ON DELETE CASCADE,
  CONSTRAINT "curriculum_edges_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "skills"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "curriculum_edges_predecessorId_successorId_key" ON "curriculum_edges"("predecessorId", "successorId");

CREATE TABLE IF NOT EXISTS "learning_objectives" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "skillId" TEXT NOT NULL,
  "courseId" TEXT,
  "objective" TEXT NOT NULL,
  "assessmentCriteria" JSONB,
  "description" TEXT,
  "bloomLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "learning_objectives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "learning_objectives_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "skill_progress" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "skillId" TEXT NOT NULL,
  "proficiencyLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "evidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "lastAssessmentId" TEXT,
  "lastAssessedAt" TIMESTAMP(3),
  "masteredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skill_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "skill_progress_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "skill_progress_userId_skillId_key" ON "skill_progress"("userId", "skillId");

CREATE TABLE IF NOT EXISTS "assessment_attempts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "assessmentId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "score" INTEGER,
  "maxScore" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "responses" JSONB,
  "feedback" TEXT,
  "integrityLevel" TEXT NOT NULL DEFAULT 'medium',
  "integrityFlagged" BOOLEAN NOT NULL DEFAULT false,
  "integrityReview" TEXT,
  "tokensEarned" INTEGER NOT NULL DEFAULT 0,
  "auditLogId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_attempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE,
  CONSTRAINT "assessment_attempts_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "credentials" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "issuedBy" TEXT NOT NULL,
  "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidence" JSONB,
  "credentialJson" JSONB,
  "blockchainAnchored" BOOLEAN NOT NULL DEFAULT false,
  "blockchainHash" TEXT,
  "verificationUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'issued',
  CONSTRAINT "credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "credentials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "cohorts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'forming',
  "maxLearners" INTEGER NOT NULL DEFAULT 30,
  "enrollmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cohorts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  CONSTRAINT "cohorts_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "class_sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "cohortId" TEXT NOT NULL,
  "sessionType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructorId" TEXT,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "buildspacesRoomId" TEXT,
  "buildspacesRoomUrl" TEXT,
  "recordingUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "class_sessions_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE,
  CONSTRAINT "class_sessions_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL,
  "leftAt" TIMESTAMP(3),
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "attended" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE,
  CONSTRAINT "attendance_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE,
  CONSTRAINT "attendance_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_sessionId_learnerId_key" ON "attendance"("sessionId", "learnerId");

CREATE TABLE IF NOT EXISTS "tutor_sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT,
  "lessonId" TEXT,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "tutor_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tutor_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "tutor_messages" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "lessonId" TEXT,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "groundedIn" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tutor_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tutor_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "tutor_sessions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "constitutional_audit_logs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "preChecksPassed" BOOLEAN NOT NULL DEFAULT true,
  "postChecksPassed" BOOLEAN NOT NULL DEFAULT true,
  "constitutionalConcern" BOOLEAN NOT NULL DEFAULT false,
  "evidence" JSONB,
  "auditDetails" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "constitutional_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "constitutional_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL,
  "consentGiven" BOOLEAN NOT NULL DEFAULT false,
  "parentConsentRequired" BOOLEAN NOT NULL DEFAULT false,
  "parentConsentGiven" BOOLEAN,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "compliance_policies" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "policyType" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "deprecatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "compliance_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_policies_policyType_jurisdiction_key" ON "compliance_policies"("policyType", "jurisdiction");

-- AI Services
CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "aiPersona" TEXT NOT NULL,
  "title" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_personalities" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "personality" TEXT NOT NULL,
  "mood" TEXT NOT NULL DEFAULT 'neutral',
  "traits" JSONB NOT NULL,
  "relationships" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_personalities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_personalities_name_key" ON "ai_personalities"("name");

CREATE TABLE IF NOT EXISTS "ai_family_interactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "familyMember" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "emotionalState" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_family_interactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_family_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ai_family_consultations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "insights" JSONB NOT NULL,
  "response" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_family_consultations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_family_consultations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "renewalDate" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");

CREATE TABLE IF NOT EXISTS "billing_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "subscriptionId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
  "invoiceNumber" TEXT NOT NULL,
  "stripeInvoiceId" TEXT,
  "billedAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "billing_history_invoiceNumber_key" ON "billing_history"("invoiceNumber");

CREATE TABLE IF NOT EXISTS "subscription_tier_config" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tier" "SubscriptionTier" NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPrice" INTEGER NOT NULL,
  "annualPrice" INTEGER NOT NULL,
  "features" JSONB NOT NULL,
  "courseLimit" INTEGER,
  "uploadLimit" INTEGER,
  "tokenMonthly" INTEGER NOT NULL,
  "revenueShare" DOUBLE PRECISION NOT NULL,
  "supportLevel" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_tier_config_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_tier_config_tier_key" ON "subscription_tier_config"("tier");

-- Token System
CREATE TABLE IF NOT EXISTS "token_balances" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "token_balances_userId_key" ON "token_balances"("userId");

CREATE TABLE IF NOT EXISTS "token_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "balanceId" TEXT NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "type" "TokenTransactionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "balanceAfter" DECIMAL(20,8) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "token_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "token_transactions_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "token_balances"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "leaderboard_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DECIMAL(20,8) NOT NULL,
  "leaderboardType" "LeaderboardType" NOT NULL,
  "period" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leaderboard_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "leaderboard_entries_userId_leaderboardType_period_key" ON "leaderboard_entries"("userId", "leaderboardType", "period");

CREATE TABLE IF NOT EXISTS "token_redemptions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "type" "TokenRedemptionType" NOT NULL,
  "status" "TokenRedemptionStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "token_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "token_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Enterprise
CREATE TABLE IF NOT EXISTS "enterprise_licenses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "organizationName" TEXT NOT NULL,
  "tier" "EnterpriseTier" NOT NULL,
  "status" "EnterpriseStatus" NOT NULL DEFAULT 'ACTIVE',
  "licenseKey" TEXT NOT NULL,
  "maxUsers" INTEGER NOT NULL,
  "maxCourses" INTEGER,
  "maxApiCalls" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "autoRenew" BOOLEAN NOT NULL DEFAULT true,
  "customDomain" TEXT,
  "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
  "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
  "apiAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_licenses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_licenses_organizationId_key" ON "enterprise_licenses"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_licenses_licenseKey_key" ON "enterprise_licenses"("licenseKey");

CREATE TABLE IF NOT EXISTS "enterprise_organizations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licenseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "website" TEXT,
  "industry" TEXT,
  "country" TEXT,
  "city" TEXT,
  "address" TEXT,
  "adminUserId" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_organizations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_organizations_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "enterprise_licenses"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_organizations_licenseId_key" ON "enterprise_organizations"("licenseId");

CREATE TABLE IF NOT EXISTS "enterprise_usage_tracking" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licenseId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "coursesCreated" INTEGER NOT NULL DEFAULT 0,
  "apiCallsUsed" INTEGER NOT NULL DEFAULT 0,
  "storageUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "enterprise_usage_tracking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_usage_tracking_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "enterprise_licenses"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "enterprise_support_tickets" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licenseId" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "SupportPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "assignedTo" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "enterprise_support_tickets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_support_tickets_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "enterprise_licenses"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_support_tickets_ticketNumber_key" ON "enterprise_support_tickets"("ticketNumber");

CREATE TABLE IF NOT EXISTS "enterprise_customizations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "licenseId" TEXT NOT NULL,
  "type" "CustomizationType" NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_customizations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enterprise_customizations_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "enterprise_licenses"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_customizations_licenseId_type_key_key" ON "enterprise_customizations"("licenseId", "type", "key");

-- Blockchain / Token Supply / Citadel
CREATE TABLE IF NOT EXISTS "token_supply" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "totalSupply" DECIMAL(20,8) NOT NULL,
  "circulatingSupply" DECIMAL(20,8) NOT NULL,
  "burnedSupply" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_supply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "burn_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "burnRate" DOUBLE PRECISION NOT NULL,
  "burnedAmount" DECIMAL(20,8) NOT NULL,
  "transactionType" "BurnTransactionType" NOT NULL,
  "reason" TEXT NOT NULL,
  "blockchainTxHash" TEXT,
  "blockchainStatus" "BlockchainStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "burn_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "burn_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "proof_of_knowledge" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "completionDate" TIMESTAMP(3) NOT NULL,
  "certificateId" TEXT NOT NULL,
  "verificationHash" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proof_of_knowledge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "proof_of_knowledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "proof_of_knowledge_certificateId_key" ON "proof_of_knowledge"("certificateId");
CREATE UNIQUE INDEX IF NOT EXISTS "proof_of_knowledge_verificationHash_key" ON "proof_of_knowledge"("verificationHash");
CREATE UNIQUE INDEX IF NOT EXISTS "proof_of_knowledge_userId_courseId_key" ON "proof_of_knowledge"("userId", "courseId");

CREATE TABLE IF NOT EXISTS "system_buy_order_revenue" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "source" "RevenueSource" NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_buy_order_revenue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_buy_order_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "revenueUsed" DECIMAL(20,8) NOT NULL,
  "tokensAcquired" DECIMAL(20,8) NOT NULL,
  "pricePerToken" DECIMAL(20,8) NOT NULL,
  "executionTime" TIMESTAMP(3) NOT NULL,
  "blockchainTxHash" TEXT,
  "status" "BuyOrderStatus" NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_buy_order_history_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_buy_order_history_blockchainTxHash_key" ON "system_buy_order_history"("blockchainTxHash");

-- AI Routing
CREATE TABLE IF NOT EXISTS "query_classifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "query" TEXT NOT NULL,
  "classifiedAs" "QueryComplexity" NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "routedTo" "RoutingTier" NOT NULL,
  "responseTime" INTEGER NOT NULL,
  "cost" DECIMAL(12,8) NOT NULL,
  "userId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "query_classifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "query_classifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "routing_metrics" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "routingTier" "RoutingTier" NOT NULL,
  "totalRequests" INTEGER NOT NULL DEFAULT 0,
  "successfulRequests" INTEGER NOT NULL DEFAULT 0,
  "failedRequests" INTEGER NOT NULL DEFAULT 0,
  "averageResponseTime" INTEGER NOT NULL,
  "averageCost" DECIMAL(12,8) NOT NULL,
  "cacheHits" INTEGER NOT NULL DEFAULT 0,
  "cacheMisses" INTEGER NOT NULL DEFAULT 0,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routing_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "routing_metrics_routingTier_key" ON "routing_metrics"("routingTier");

CREATE TABLE IF NOT EXISTS "ai_routing_cache" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "queryHash" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "routingTier" "RoutingTier" NOT NULL,
  "cost" DECIMAL(12,8) NOT NULL,
  "ttl" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_routing_cache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_routing_cache_queryHash_key" ON "ai_routing_cache"("queryHash");

-- Agents/Tasks
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "title" TEXT,
  "description" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "agentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "heartbeat" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "agents_name_key" ON "agents"("name");

CREATE TABLE IF NOT EXISTS "agent_executions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "taskId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "logs" JSONB,
  "result" JSONB,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_executions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "agent_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "knowledge_nodes" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "embedding_json" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "knowledge_nodes_pkey" PRIMARY KEY ("id")
);

-- Citadel Fund
CREATE TABLE IF NOT EXISTS "citadel_funds" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "totalCollected" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "totalDistributed" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "currentBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "citadel_funds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "citadel_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "type" "CitadelTransactionType" NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "source" TEXT,
  "recipient" TEXT,
  "purpose" TEXT,
  "description" TEXT,
  "transactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "citadel_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scholarships" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL,
  "amount" DECIMAL(20,8) NOT NULL,
  "reason" TEXT NOT NULL,
  "courseType" TEXT,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scholarships_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "grants" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "recipientId" TEXT,
  "recipientName" TEXT,
  "amount" DECIMAL(20,8) NOT NULL,
  "purpose" TEXT NOT NULL,
  "projectType" TEXT,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "proof_of_values" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "valueScore" DOUBLE PRECISION NOT NULL,
  "proofType" "MiningType" NOT NULL,
  "status" "MiningStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "verifierId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proof_of_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "proof_of_values_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "proof_of_values_contentHash_key" ON "proof_of_values"("contentHash");

CREATE TABLE IF NOT EXISTS "secrets" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "description" TEXT,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT NOT NULL DEFAULT 'system',
  CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "secrets_key_key" ON "secrets"("key");

CREATE TABLE IF NOT EXISTS "blockchain_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "transactionHash" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "contractAddress" TEXT,
  "contractMethod" TEXT,
  "gasUsed" TEXT,
  "gasPrice" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "blockNumber" INTEGER,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "blockchain_transactions_transactionHash_key" ON "blockchain_transactions"("transactionHash");

CREATE TABLE IF NOT EXISTS "blockchain_events" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "eventType" TEXT NOT NULL,
  "contractAddress" TEXT NOT NULL,
  "transactionHash" TEXT,
  "blockNumber" INTEGER,
  "data" JSONB NOT NULL,
  "amount" DOUBLE PRECISION,
  "from" TEXT,
  "to" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blockchain_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "certificates" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tokenId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "courseId" TEXT,
  "achievementId" TEXT,
  "ipfsHash" TEXT,
  "metadata" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_tokenId_key" ON "certificates"("tokenId");

CREATE TABLE IF NOT EXISTS "staking_transactions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "action" TEXT NOT NULL,
  "stakingPeriod" INTEGER,
  "rewardRate" DOUBLE PRECISION,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staking_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "value_creation_records" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL,
  "activityId" TEXT,
  "valueScore" DOUBLE PRECISION NOT NULL,
  "rewardAmount" DOUBLE PRECISION,
  "rewardTxHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "antiGamingChecks" JSONB,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "value_creation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "citadel_fund_allocations" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "transactionId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ZAR',
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversed" BOOLEAN NOT NULL DEFAULT false,
  "reversedAt" TIMESTAMP(3),
  CONSTRAINT "citadel_fund_allocations_pkey" PRIMARY KEY ("id")
);

-- BuildSpaces
CREATE TABLE IF NOT EXISTS "buildspaces_projects" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "buildspaces_projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buildspaces_projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "buildspaces_projects_slug_key" ON "buildspaces_projects"("slug");

CREATE TABLE IF NOT EXISTS "buildspaces_specs" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'yaml',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "buildspaces_specs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buildspaces_specs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "buildspaces_projects"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "buildspaces_executions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId" TEXT,
  "specId" TEXT,
  "agentName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "input" JSONB NOT NULL,
  "output" JSONB,
  "tokensUsed" INTEGER DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "buildspaces_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "buildspaces_executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "buildspaces_projects"("id") ON DELETE CASCADE,
  CONSTRAINT "buildspaces_executions_specId_fkey" FOREIGN KEY ("specId") REFERENCES "buildspaces_specs"("id") ON DELETE CASCADE
);
