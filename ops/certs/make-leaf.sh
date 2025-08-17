#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <service-name>" >&2
  exit 1
fi

NAME="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"
CA_KEY="$DIR/ca.key"
CA_CRT="$DIR/ca.crt"
OUT_DIR="$DIR/$NAME"
mkdir -p "$OUT_DIR"

if [ ! -f "$CA_KEY" ] || [ ! -f "$CA_CRT" ]; then
  echo "CA files not found. Run make-int-ca.sh first" >&2
  exit 1
fi

openssl genrsa -out "$OUT_DIR/$NAME.key" 2048 >/dev/null 2>&1
openssl req -new -key "$OUT_DIR/$NAME.key" -subj "/CN=$NAME" -out "$OUT_DIR/$NAME.csr"
openssl x509 -req -in "$OUT_DIR/$NAME.csr" -CA "$CA_CRT" -CAkey "$CA_KEY" \
  -CAcreateserial -out "$OUT_DIR/$NAME.crt" -days 365 -sha256
rm "$OUT_DIR/$NAME.csr"

echo "Created certs in $OUT_DIR"
