#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-8080}"
MEDIA_DIR="${1:-${MEDIA_DIR:-}}"

if [[ -z "$MEDIA_DIR" ]]; then
  echo "Deploy iPod nano as a web app in Docker."
  echo
  echo "Usage:"
  echo "  ./scripts/deploy.sh /path/to/Music"
  echo "  MEDIA_DIR=/path/to/Music PORT=8080 ./scripts/deploy.sh"
  exit 1
fi

if [[ ! -d "$MEDIA_DIR" ]]; then
  echo "Not a folder: $MEDIA_DIR" >&2
  exit 1
fi

MEDIA_DIR="$(cd "$MEDIA_DIR" && pwd)"
export MEDIA_DIR PORT

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker, then retry." >&2
  exit 1
fi

echo "Building iPod nano…"
docker compose build
echo "Starting at http://localhost:${PORT}"
echo "Library: ${MEDIA_DIR}"
docker compose up -d
docker compose ps
echo
echo "Open http://localhost:${PORT}"
echo "Stop with: docker compose down"
