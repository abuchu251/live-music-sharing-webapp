#!/bin/bash
set -e

DOMAIN="jemaw.live"
EMAIL="admin@jemaw.live"

echo "=== Initializing SSL for $DOMAIN and www.$DOMAIN ==="

# 1. Ensure Swap is enabled (Lightsail 512MB instances have 0 swap by default, causing Docker OOM crashes)
if [ $(swapon --show | wc -l) -le 1 ]; then
  echo "Enabling 2GB swap to prevent low-memory crashes on Lightsail..."
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab 2>/dev/null || true
  echo "Swap enabled successfully."
fi

# 2. Restart Docker daemon if it crashed due to OOM
sudo systemctl restart docker 2>/dev/null || true
sleep 2

mkdir -p ./certbot/conf/live/$DOMAIN
mkdir -p ./certbot/www

# 3. Build and start web container
echo "Starting web container..."
docker compose up -d --build web

# 4. Request real Let's Encrypt SSL certificate
echo "Requesting production SSL certificate from Let's Encrypt..."
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN -d www.$DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email --force-renewal

# 5. Reload Nginx
echo "Reloading Nginx with new certificate..."
docker compose exec web nginx -s reload

echo "=== SSL setup complete! Visit https://$DOMAIN ==="
