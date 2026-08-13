# Deploy — solarthani.com (self-host VPS)

ไฟล์ในโฟลเดอร์นี้จัดการ 3 เรื่อง: process manager (PM2), reverse proxy (nginx), SSL (certbot/Let's Encrypt)

## ไฟล์

- `ecosystem.config.js` — PM2 config รัน `next start -p 3000` พร้อม auto-restart ถ้า process ตาย
- `nginx/solarthani.com.conf` — nginx reverse proxy รับ port 80/443 ส่งต่อไป Next.js ที่ port 3000
- `setup-vps.sh` — สคริปต์ตั้งค่าครั้งแรกทั้งหมด (Node, nginx, certbot, PM2, SSL) รันครั้งเดียวตอน provision VPS ใหม่

## ขั้นตอน setup ครั้งแรก

1. เช่า VPS (Ubuntu/Debian) แล้วชี้ DNS ของ `solarthani.com` + `www.solarthani.com` มาที่ IP ของ VPS — รอ propagate ก่อน (เช็คด้วย `dig solarthani.com`)
2. SSH เข้า VPS แล้ว clone repo:
   ```bash
   sudo mkdir -p /var/www/solarthani && sudo chown $USER:$USER /var/www/solarthani
   git clone https://github.com/Mykobyhub/SolarThani.git /var/www/solarthani
   ```
3. สร้าง `/var/www/solarthani/frontend/.env.production` ให้ครบ (ดูตัวอย่างจากเครื่อง dev — มี DATABASE_URL, JWT_SECRET, SMTP_USER, NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, NEXT_PUBLIC_SITE_URL, UPLOADS_DIR)
4. ย้ายไฟล์ uploads เดิม (213MB จากเครื่อง dev) ไปที่ path เดียวกับ `UPLOADS_DIR` ที่ตั้งไว้ เช่น:
   ```bash
   rsync -avz "g:/SolarPanel/uploads/" user@vps-ip:/var/www/solarthani/uploads/
   ```
5. แก้ตัวแปร `APP_DIR` และ `LE_EMAIL` ใน `setup-vps.sh` ให้ตรงกับจริง แล้วรัน:
   ```bash
   chmod +x deploy/setup-vps.sh
   ./deploy/setup-vps.sh
   ```

สคริปต์จะติดตั้ง Node/nginx/certbot/PM2, build แอป, ตั้ง reverse proxy, ขอ SSL cert, และสั่งรันแอปด้วย PM2 พร้อม auto-start ตอน VPS reboot (`pm2 startup` + `pm2 save`)

## Auto-renew SSL

Certbot ติดตั้ง systemd timer ต่ออายุ cert อัตโนมัติให้แล้ว (ปกติเช็คทุกวัน ต่อเมื่อเหลืออายุ <30 วัน) ตรวจสอบได้ด้วย:
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run   # ทดสอบว่าต่ออายุได้จริง
```

## Deploy โค้ดใหม่ (หลัง setup ครั้งแรกแล้ว)

```bash
cd /var/www/solarthani
git pull
cd frontend && npm ci && npm run build
cd .. && pm2 reload solarthani
```

`pm2 reload` รีสตาร์ทแบบไม่มี downtime (ต่างจาก `pm2 restart`)

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `pm2 status` | ดูสถานะ app |
| `pm2 logs solarthani` | ดู log แบบ real-time |
| `pm2 monit` | ดู CPU/memory แบบ dashboard |
| `sudo systemctl status nginx` | สถานะ nginx |
| `sudo nginx -t` | ตรวจ syntax config ก่อน reload |
