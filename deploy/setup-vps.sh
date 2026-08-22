#!/usr/bin/env bash
# ===== Solar Thani — VPS First-Time Setup =====
# รันสคริปต์นี้ "บน VPS จริง" ผ่าน SSH เท่านั้น (ไม่ใช่รันจากเครื่อง dev)
# รองรับ Ubuntu และ Debian (ทดสอบกับ Debian 13) — ใช้ apt-get เหมือนกัน
#
# ข้อกำหนดก่อนรัน:
#   - Ubuntu/Debian VPS (login เป็น root หรือ user ที่มีสิทธิ์ sudo ก็ได้ สคริปต์เช็คให้อัตโนมัติ)
#   - DNS ของ solarthani.com และ www.solarthani.com ชี้มาที่ IP ของ VPS นี้แล้ว (รอ propagate ให้เรียบร้อยก่อน
#     ไม่งั้นขั้นตอนขอ SSL cert จะ fail)
#   - Clone repo นี้ไว้ที่ APP_DIR ด้านล่างแล้ว (git clone https://github.com/Mykobyhub/SolarThani.git)
#   - วางไฟล์ frontend/.env.production ให้ครบ (DATABASE_URL, JWT_SECRET, SMTP_*, UPLOADS_DIR ฯลฯ)
#   - ย้ายโฟลเดอร์ uploads/ เดิม (จากเครื่อง dev) มาไว้ที่ path ตรงกับ UPLOADS_DIR ใน .env.production แล้ว
#
# วิธีรัน:
#   chmod +x deploy/setup-vps.sh
#   ./deploy/setup-vps.sh

set -euo pipefail

DOMAIN="solarthani.com"
WWW_DOMAIN="www.solarthani.com"
APP_DIR="/var/www/solarthani"      # แก้ให้ตรงกับ path จริงที่ clone repo ไว้บน VPS
LE_EMAIL="admin@solarthani.com"    # แก้เป็นอีเมลจริงสำหรับแจ้งเตือน SSL cert ใกล้หมดอายุ

# Hostinger VPS ส่วนใหญ่ login เป็น root ตรงๆ (ไม่มี sudo ติดตั้งมาด้วย) — เช็คแล้วข้าม sudo ถ้าเป็น root อยู่แล้ว
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> [0/6] Installing base prerequisites..."
$SUDO apt-get update
$SUDO apt-get install -y curl ca-certificates gnupg

echo "==> [1/6] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
$SUDO apt-get install -y nodejs

echo "==> [2/6] Installing nginx + certbot..."
$SUDO apt-get install -y nginx certbot python3-certbot-nginx

echo "==> [3/6] Installing PM2..."
$SUDO npm install -g pm2

echo "==> [4/6] Installing dependencies + building app..."
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> [5/6] Configuring nginx reverse proxy..."
$SUDO mkdir -p /var/www/certbot
$SUDO cp "$APP_DIR/deploy/nginx/solarthani.com.conf" /etc/nginx/sites-available/solarthani.com
$SUDO ln -sf /etc/nginx/sites-available/solarthani.com /etc/nginx/sites-enabled/solarthani.com
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t
$SUDO systemctl reload nginx

echo "==> Obtaining SSL certificate (Let's Encrypt)..."
$SUDO certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" --redirect

echo "==> [6/6] Starting app with PM2..."
cd "$APP_DIR"
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup systemd -u "$(whoami)" --hp "$HOME" | tail -1 | $SUDO bash

echo ""
echo "==> เสร็จแล้ว! ตรวจสอบด้วย:"
echo "    pm2 status                 — ดูสถานะ app"
echo "    pm2 logs solarthani        — ดู log"
echo "    sudo systemctl status nginx"
echo "    curl -I https://$DOMAIN"
