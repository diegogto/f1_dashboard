#!/bin/sh
set -e

echo "🔄 Running Prisma migrations..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ WARNING: DATABASE_URL environment variable is NOT set! Prisma migrate deploy will likely fail or fall back to localhost."
else
  # Mask password for safety in logs
  echo "DATABASE_URL is set: $(echo $DATABASE_URL | sed 's/\/\/.*:[^@]*@/\/\/<hidden>@/')"
fi

npx prisma migrate deploy

echo "✅ Migrations done. Starting app..."
exec "$@"
