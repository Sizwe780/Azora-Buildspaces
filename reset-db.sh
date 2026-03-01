#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_gLD2S8NTdcyr@ep-falling-king-aim2799b-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
npx prisma migrate reset --force
