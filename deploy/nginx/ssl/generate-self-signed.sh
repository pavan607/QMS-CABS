#!/bin/sh
set -e
cd "$(dirname "$0")"

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=qms" \
  -addext "subjectAltName=DNS:qms,DNS:localhost,IP:127.0.0.1"

chmod 600 privkey.pem 2>/dev/null || true
echo "Created fullchain.pem and privkey.pem in $(pwd)"
