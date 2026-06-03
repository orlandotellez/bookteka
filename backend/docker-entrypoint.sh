#!/bin/sh
set -e

echo "⏳ Esperando a PostgreSQL..."
until pg_isready -h db -U bookteka -d bookteka_db 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL listo"

# Prisma migrations (tablas de la app: book, user_book, bookmark, user_streak...)
echo "⏳ Corriendo Prisma migrations..."
npx prisma migrate deploy
echo "✅ Prisma migrations listas"

# Better-auth migrations (tablas: user, session, account, verification)
echo "⏳ Corriendo Better-Auth migrations..."
for f in better-auth_migrations/*.sql; do
  if [ -f "$f" ]; then
    echo "   → $(basename $f)"
    if psql "$DATABASE_URL" -f "$f" -q 2>&1; then
      echo "   ✅ aplicada"
    else
      # Si falla, puede ser porque ya existían las tablas (migración repetida)
      echo "   ⚠️  ya existían (ok)"
    fi
  fi
done
echo "✅ Better-Auth migrations listas"

echo "🚀 Iniciando servidor..."
exec "$@"
