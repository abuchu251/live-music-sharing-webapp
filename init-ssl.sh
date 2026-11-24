#!/bin/bash
set -e

DOMAIN="jemaw.live"
EMAIL="admin@jemaw.live"

echo "=== Initializing SSL for $DOMAIN and www.$DOMAIN ==="

# 1. Enable 2GB swap if not present
if [ $(swapon --show | wc -l) -le 1 ]; then
  echo "Enabling 2GB swap to protect server memory..."
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab 2>/dev/null || true
fi

# 2. Fix Docker DNS resolution (prevents NameResolutionError inside containers)
if [ ! -f /etc/docker/daemon.json ] || ! grep -q "8.8.8.8" /etc/docker/daemon.json 2>/dev/null; then
  echo "Configuring reliable DNS (8.8.8.8, 1.1.1.1) for Docker daemon..."
  echo '{"dns": ["8.8.8.8", "1.1.1.1"]}' | sudo tee /etc/docker/daemon.json
  sudo systemctl restart docker
  sleep 2
fi

# 3. Prepare directories
mkdir -p ./certbot/conf/live/$DOMAIN
mkdir -p ./certbot/www

# 4. Generate initial fallback certificate with OpenSSL so Nginx can boot without errors
if [ ! -f ./certbot/conf/live/$DOMAIN/fullchain.pem ] || [ ! -f ./certbot/conf/live/$DOMAIN/privkey.pem ]; then
  echo "Generating initial fallback certificate..."
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout ./certbot/conf/live/$DOMAIN/privkey.pem \
    -out ./certbot/conf/live/$DOMAIN/fullchain.pem \
    -subj "/CN=localhost"
fi

# 5. Start containers
echo "Starting web and backend containers..."
docker compose up -d web server db

# 6. Request production Let's Encrypt certificate with explicit public DNS
echo "Requesting verified Let's Encrypt SSL certificate..."
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN -d www.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email --force-renewal

# 7. Reload Nginx with real certificate
echo "Reloading Nginx with production SSL certificate..."
docker compose exec web nginx -s reload

echo "=== SSL setup complete! Visit https://$DOMAIN ==="
