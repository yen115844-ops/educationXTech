#!/usr/bin/env bash
# Backup MongoDB bằng mongodump (cần cài MongoDB Database Tools)
# Cài: brew install mongodb-database-tools
# Chạy: ./scripts/backup-mongodump.sh hoặc bash scripts/backup-mongodump.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"
OUT_DIR="$BACKEND_DIR/backups/mongodump"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Không tìm thấy .env. Tạo file $ENV_FILE với MONGODB_URI."
  exit 1
fi

# Đọc MONGODB_URI từ .env (dòng có dạng MONGODB_URI=...)
export $(grep -v '^#' "$ENV_FILE" | xargs)
if [[ -z "$MONGODB_URI" ]]; then
  echo "Chưa có MONGODB_URI trong .env"
  exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
DUMP_DIR="$OUT_DIR/$TIMESTAMP"
mkdir -p "$DUMP_DIR"

if ! command -v mongodump &> /dev/null; then
  echo "Chưa cài mongodump. Cài: brew install mongodb-database-tools"
  exit 1
fi

echo "Đang backup MongoDB vào $DUMP_DIR ..."
mongodump --uri="$MONGODB_URI" --out="$DUMP_DIR"
echo "Backup xong: $DUMP_DIR"
