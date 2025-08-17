#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
CA_KEY="$DIR/ca.key"
CA_CRT="$DIR/ca.crt"

if [ -f "$CA_KEY" ] || [ -f "$CA_CRT" ]; then
  echo "CA key or cert already exists in $DIR" >&2
  exit 1
fi

openssl genrsa -out "$CA_KEY" 4096 >/dev/null 2>&1
openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
  -subj "/CN=TACTIX-Internal-CA" -out "$CA_CRT"

echo "Created CA at $CA_CRT"
