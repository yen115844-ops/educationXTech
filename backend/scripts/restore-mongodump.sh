#!/usr/bin/env bash
# Restore MongoDB từ backup mongodump (sau khi chạy backup-mongodump.sh)
#
# Cách dùng:
#   ./scripts/restore-mongodump.sh 2025-03-07_12-30-00
#   ./scripts/restore-mongodump.sh backups/mongodump/2025-03-07_12-30-00
#
# Không truyền tham số → in danh sách backup mongodump có sẵn.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"
MONGODUMP_BASE="$BACKEND_DIR/backups/mongodump"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Không tìm thấy .env. Tạo file $ENV_FILE với MONGODB_URI."
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)
if [[ -z "$MONGODB_URI" ]]; then
  echo "Chưa có MONGODB_URI trong .env"
  exit 1
fi

if ! command -v mongorestore &> /dev/null; then
  echo "Chưa cài mongorestore. Cài: brew install mongodb-database-tools"
  exit 1
fi

list_backups() {
  if [[ ! -d "$MONGODUMP_BASE" ]]; then
    echo "Chưa có thư mục $MONGODUMP_BASE"
    return
  fi
  echo "Các backup mongodump có sẵn:"
  ls -1 "$MONGODUMP_BASE" 2>/dev/null || echo "  (không có)"
}

if [[ -z "$1" ]]; then
  echo "Cách dùng: ./scripts/restore-mongodump.sh <tên-thư-mục-backup>"
  echo "Ví dụ:    ./scripts/restore-mongodump.sh 2025-03-07_12-30-00"
  echo ""
  list_backups
  exit 0
fi

# Cho phép truyền tên thư mục (2025-03-07_12-30-00) hoặc đường dẫn đầy đủ
if [[ -d "$1" ]]; then
  DUMP_PATH="$1"
elif [[ -d "$MONGODUMP_BASE/$1" ]]; then
  DUMP_PATH="$MONGODUMP_BASE/$1"
else
  echo "Không tìm thấy thư mục backup: $1"
  list_backups
  exit 1
fi

# mongorestore cần đường dẫn chứa thư mục tên database (vd: xtech)
# mongodump --out=DUMP_DIR tạo ra DUMP_DIR/<dbname>/...
# Nên DUMP_PATH phải là thư mục chứa <dbname>, ví dụ backups/mongodump/2025-03-07_12-30-00
if [[ ! -d "$DUMP_PATH" ]]; then
  echo "Thư mục không tồn tại: $DUMP_PATH"
  exit 1
fi

echo "Restore từ: $DUMP_PATH"
echo "Database hiện tại sẽ bị GHI ĐÈ (--drop). Bấm Ctrl+C để hủy, Enter để tiếp tục."
read -r

mongorestore --uri="$MONGODB_URI" --drop "$DUMP_PATH"
echo "Restore xong."
