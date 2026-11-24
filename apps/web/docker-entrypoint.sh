#!/bin/sh
set -e

DOMAIN="jemaw.live"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

mkdir -p "$CERT_DIR"
mkdir -p /var/www/certbot

# If certificate doesn't exist, create a temporary self-signed certificate so Nginx starts without crashing
if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "No SSL certificate found for $DOMAIN. Generating self-signed temporary certificate..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=localhost"
fi

exec "$@"
