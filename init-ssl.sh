#!/bin/bash
set -e

DOMAIN="jemaw.live"
EMAIL="admin@jemaw.live"

echo "=== Initializing SSL for $DOMAIN and www.$DOMAIN ==="

# 1. Temporarily stop Nginx so port 80 is completely free for Certbot standalone
echo "Temporarily stopping web container to free port 80..."
docker compose stop web 2>/dev/null || true

# 2. Ensure directories exist
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# 3. Request official Let's Encrypt certificate using standalone mode on port 80
echo "Requesting official Let's Encrypt SSL certificate via standalone authenticator..."
docker compose run --rm -p 80:80 --entrypoint certbot certbot certonly --standalone \
  -d $DOMAIN -d www.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email --force-renewal

# 4. Ensure permissions so Nginx can read the newly generated certificates
sudo chmod -R 755 ./certbot/conf 2>/dev/null || true

# 5. Start all containers (Nginx now boots directly with the genuine SSL certificate)
echo "Starting web, backend, and database containers with production SSL..."
docker compose up -d web server db

echo "=== SSL setup complete! Visit https://$DOMAIN ==="
