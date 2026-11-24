#!/bin/bash
set -e

DOMAIN="jemaw.live"
EMAIL="admin@jemaw.live"

echo "=== Initializing SSL for $DOMAIN and www.$DOMAIN ==="

mkdir -p ./certbot/conf/live/$DOMAIN
mkdir -p ./certbot/www

echo "Starting web container..."
docker compose up -d web

echo "Requesting production SSL certificate from Let's Encrypt..."
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN -d www.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email --force-renewal

echo "Reloading Nginx with new certificate..."
docker compose exec web nginx -s reload

echo "=== SSL setup complete! Visit https://$DOMAIN ==="
