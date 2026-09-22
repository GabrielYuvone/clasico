#!/bin/bash
set -euo pipefail

# Build-time database setup.
#
# Antes (cuando el schema era SQLite) este script copiaba db/custom.db al build
# y corría db:push para inicializar el SQLite packaged. Pero como migramos a
# Postgres (Neon), ya no necesitamos un SQLite packaged en el build — el
# runtime se conecta a Neon via DATABASE_URL.
#
# Lo que SÍ hacemos acá:
#   1. Si el schema es sqlite (todavía), comportamiento viejo: copiar y push.
#   2. Si el schema es postgresql (nuevo), no hacer nada — el runtime carga
#      DATABASE_URL desde .env (ver start.sh).
#   3. En cualquier caso, si hay un db/custom.db local (legacy), lo copiamos
#      al build por las dudas (no rompe nada, y permite rollback).

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"
SOURCE_DB_DIR="$PROJECT_DIR/db"
SOURCE_DB_PATH="$SOURCE_DB_DIR/custom.db"
TARGET_DB_DIR="$BUILD_DIR/db"
TARGET_DB_PATH="$TARGET_DB_DIR/custom.db"
SCHEMA_FILE="$PROJECT_DIR/prisma/schema.prisma"

# Detectar el provider del schema (sqlite o postgresql).
DB_PROVIDER="unknown"
if [ -f "$SCHEMA_FILE" ]; then
    DB_PROVIDER=$(grep -E '^[[:space:]]*provider[[:space:]]*=' "$SCHEMA_FILE" \
        | grep -oE '"(sqlite|postgresql|mysql)"' | tr -d '"' | head -1)
    DB_PROVIDER="${DB_PROVIDER:-unknown}"
fi
echo "🧬 Provider del schema: $DB_PROVIDER"

mkdir -p "$TARGET_DB_DIR"

# Si el schema es postgresql, no necesitamos hacer nada con el SQLite packaged.
# El runtime va a usar DATABASE_URL del .env (Neon).
if [ "$DB_PROVIDER" = "postgresql" ]; then
    echo "🟢 Schema Postgres detectado: el runtime usará DATABASE_URL externa (Neon)."
    echo "   No se crea SQLite packaged — el start.sh carga .env con la URL de Neon."
    # Verificar que el .env tiene DATABASE_URL apuntando a Postgres
    if [ -f "$PROJECT_DIR/.env" ]; then
        if grep -q "^DATABASE_URL=postgresql://" "$PROJECT_DIR/.env"; then
            echo "   ✓ .env tiene DATABASE_URL=postgresql://... ✓"
        else
            echo "   ⚠️  .env no tiene DATABASE_URL=postgresql://. El runtime va a caer al SQLite packaged (que no existe)."
            echo "       Editá .env con la URL de Neon antes de deployar."
        fi
    else
        echo "   ⚠️  No hay .env en el proyecto. El runtime no va a tener DATABASE_URL."
    fi
    # Igual copiamos el SQLite local si existe, por si algún rollback lo necesita.
    if [ -f "$SOURCE_DB_PATH" ]; then
        echo "   📦 Copiando SQLite local (legacy) al build por las dudas..."
        cp -a "$SOURCE_DB_DIR/." "$TARGET_DB_DIR/"
    fi
    echo "✅ Setup Postgres OK (sin SQLite packaged)"
    exit 0
fi

# --- Comportamiento viejo (SQLite) ---
if [ -f "$SOURCE_DB_PATH" ]; then
    echo "🗄️  Copiando Preview DB (SQLite) al build..."
    cp -a "$SOURCE_DB_DIR/." "$TARGET_DB_DIR/"
else
    echo "ℹ️  No hay db/custom.db local — se inicializa SQLite packaged vacío"
fi

echo "🗄️  Sincronizando schema SQLite al packaged..."
(
    cd "$PROJECT_DIR"
    DATABASE_URL="file:$TARGET_DB_PATH" bun run db:push
)

if [ ! -f "$TARGET_DB_PATH" ]; then
    echo "❌ db:push OK pero no se generó $TARGET_DB_PATH"
    exit 1
fi

echo "✅ SQLite packaged listo"
ls -lah "$TARGET_DB_DIR"
