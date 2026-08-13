# Solar Panel — Requirements & Project Documentation

> อัปเดตล่าสุด: 2026-08-11  
> สถานะ: **Migration to Next.js 16 ✅ Complete (N1–N9)** | Phase 18 เป็น Phase สุดท้ายของ Vanilla | **Phase 19 (Next.js) ✅ — Admin: ส่งมอบบัญชี + แก้ไขผู้ติดตั้ง + Favicon**  
> เวอร์ชัน: Phase 1–18 (Vanilla) → **Next.js Migration N1–N9 ✅** → **Phase 19 (Next.js) ✅** — Next.js 16 + TypeScript + Tailwind CSS 4 + httpOnly Cookie Auth

---

## ชื่อโปรเจค
Solar Panel — แหล่งรวมบริษัทและช่างติดตั้งโซลาร์

## วัตถุประสงค์
เว็บไซต์รวบรวมบริษัทและช่างติดตั้งโซลาร์เซลล์ในไทย พร้อมเครื่องมือคำนวณค่าไฟและค่าติดตั้งเบื้องต้น เพื่อให้ลูกค้าเปรียบเทียบและเลือกผู้ให้บริการได้ง่ายขึ้น

## กลุ่มเป้าหมาย
- เจ้าของบ้านหรืออาคารที่ต้องการติดตั้งโซลาร์
- ผู้สนใจเปรียบเทียบผู้ติดตั้งหลายราย
- ผู้รับติดตั้งโซลาร์ที่ต้องการลงทะเบียนเป็นผู้ให้บริการ

---

## การ Start เว็บ (Development)

เปิด **1 terminal** เท่านั้น — Next.js รวม frontend + API ไว้ใน server เดียว

```bash
cd g:\SolarPanel\frontend

# ครั้งแรก: สร้าง .env.local
copy .env.local.example .env.local   # (ถ้ายังไม่มี ดูค่าใน .env.local)

# ติดตั้ง dependencies (ครั้งแรกครั้งเดียว)
npm install

# รัน dev server
npm run dev
```

> **หมายเหตุ:** `.env.local` อยู่ที่ `frontend/.env.local` — มี JWT_SECRET, SMTP_USER, SMTP_PASS, NEXT_PUBLIC_APP_URL

### URL ทั้งหมด

| หน้า | URL |
|------|-----|
| หน้าแรก | `http://localhost:3000/` |
| รายชื่อผู้ติดตั้ง | `http://localhost:3000/installers` |
| คำนวณราคา | `http://localhost:3000/calculator` |
| รายละเอียดผู้ติดตั้ง | `http://localhost:3000/installers/1` |
| **ติดต่อเรา** | `http://localhost:3000/contact` |
| สมัครผู้ติดตั้ง | `http://localhost:3000/register` |
| เข้าสู่ระบบ | `http://localhost:3000/login` |
| ลืมรหัสผ่าน | `http://localhost:3000/forgot-password` |
| ตั้งรหัสผ่านใหม่ | `http://localhost:3000/reset-password?token=...` |
| Dashboard ผู้ติดตั้ง | `http://localhost:3000/dashboard` |
| **Admin Panel** | `http://localhost:3000/admin` |
| Admin — แก้ไขผู้ติดตั้ง (Phase 19) | `http://localhost:3000/admin/installers/:id` |
| Health check | `http://localhost:3000/api/health` |

### API Endpoints (Next.js Route Handlers)

> API paths เหมือนเดิมทุกตัว — implementation เปลี่ยนจาก Express → Next.js Route Handlers  
> Auth: JWT เก็บใน **httpOnly Cookie** (เดิมคือ localStorage)

```
GET  /api/health
POST /api/contact                            — ส่งฟอร์มขอใบเสนอราคา
POST /api/auth/register
POST /api/auth/login                         — set JWT ใน httpOnly cookie
POST /api/auth/logout                        — clear cookie
GET  /api/auth/me                            — session user จาก cookie
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/installer/me                       — ต้อง login (cookie)
PUT  /api/installer/me
POST /api/installer/logo
PUT  /api/installer/password
GET  /api/installer/leads
POST /api/installer/portfolio
DELETE /api/installer/portfolio/:id
PUT  /api/leads/:id/status
GET  /api/installers                         — รายชื่อผู้ติดตั้ง (สาธารณะ)
GET  /api/installers/:id
GET  /api/blogs
GET  /api/blogs/featured
GET  /api/blogs/:slug
GET  /api/reviews                            — GET list / POST new
GET  /api/reviews/:id/verify
POST /api/reviews/:id/reply
GET  /api/portfolio
GET  /api/content
POST /api/contact-message
GET  /api/analytics-config
POST /api/admin/seed                         — สร้าง Admin account ครั้งแรก
GET  /api/admin/stats
GET  /api/admin/installers
GET  /api/admin/installers/:id                — ข้อมูลผู้ติดตั้งทั้งหมด (สำหรับหน้า Edit) — Phase 19
PUT  /api/admin/installers/:id                — แก้ไขข้อมูลผู้ติดตั้งแบบเต็ม (merge-safe) — Phase 19
PUT  /api/admin/installers/:id/approve
PUT  /api/admin/installers/:id/featured
PUT  /api/admin/installers/:id/claim          — ส่งมอบบัญชีให้เจ้าของ (เปลี่ยนอีเมล + ส่งรหัสผ่านใหม่ทางอีเมล) — Phase 19
GET  /api/admin/reviews
PUT  /api/admin/reviews/:id
GET  /api/admin/leads
PUT  /api/admin/leads/:id/assign
GET  /api/admin/content
PUT  /api/admin/content/:key
GET  /api/admin/smtp
PUT  /api/admin/smtp
POST /api/admin/smtp/test
GET  /api/admin/blogs
POST /api/admin/blogs
PUT  /api/admin/blogs/:id
DELETE /api/admin/blogs/:id
PUT  /api/admin/blogs/:id/featured
GET  /api/admin/contact-messages
PUT  /api/admin/contact-messages/:id/status
POST /api/admin/upload/site-logo
POST /api/admin/upload/hero-image
POST /api/admin/upload/installers-header-image
POST /api/admin/upload/blog-image
POST /api/admin/upload/featured-image/:num
DELETE /api/admin/settings/logo
DELETE /api/admin/settings/hero-image
DELETE /api/admin/settings/installers-header-image
DELETE /api/admin/settings/featured-image/:num
GET  /api/auth/providers
GET  /api/auth/google  +  /api/auth/google/callback
GET  /api/auth/facebook  +  /api/auth/facebook/callback
GET  /api/auth/twitter  +  /api/auth/twitter/callback
GET  /api/auth/tiktok  +  /api/auth/tiktok/callback
GET  /api/admin/oauth-providers
PUT  /api/admin/oauth-providers/:provider
```

### วิธีสร้าง Admin Account (ทำครั้งเดียวเมื่อ setup ครั้งแรก)

```bash
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"<JWT_SECRET_ใน_frontend/.env.local>\", \"email\": \"admin\", \"password\": \"yourpassword\"}"
# → แล้ว Login ที่ http://localhost:3000/login
# → ระบบ redirect ไป /admin อัตโนมัติเมื่อ role = admin
```

> **หมายเหตุ:**
> - `solarpanel.db` อยู่ที่ root `G:\SolarPanel\solarpanel.db`
> - `uploads/` อยู่ที่ `G:\SolarPanel\uploads/`
> - Email ใช้ได้เมื่อตั้ง `SMTP_USER` + `SMTP_PASS` ใน `frontend/.env.local`

---

## โครงสร้างไฟล์ (ปัจจุบัน)

```
G:\SolarPanel\
├── frontend/                          ← Next.js 16 app
│   ├── app/
│   │   ├── layout.tsx                 ← root layout (Navbar + Footer)
│   │   ├── page.tsx                   ← หน้าแรก (Hero, Stats, Directory, Calculator CTA, Blogs, CTA)
│   │   ├── installers/
│   │   │   ├── page.tsx               ← รายชื่อผู้ติดตั้ง (ISR) + InstallersClient.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx           ← รายละเอียดผู้ติดตั้ง (SSG + ISR)
│   │   │       └── ReviewSection.tsx  ← Slider CAPTCHA anti-spam
│   │   ├── blog/
│   │   │   ├── page.tsx               ← บทความทั้งหมด + BlogListClient.tsx
│   │   │   └── [slug]/page.tsx        ← บทความเดี่ยว + sidebar + related
│   │   ├── calculator/page.tsx        ← Calculator wizard 6 ขั้น (Client Component)
│   │   ├── contact/page.tsx           ← ฟอร์มติดต่อ (Server Action)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx               ← Server Component (auth check)
│   │   │   └── DashboardClient.tsx    ← tabs: ภาพรวม, Lead, โปรไฟล์, ผลงาน, ตั้งค่า
│   │   ├── admin/
│   │   │   ├── page.tsx               ← Server Component (admin check)
│   │   │   ├── AdminClient.tsx        ← tabs: ภาพรวม, ผู้ติดตั้ง, รีวิว, Lead, บทความ, ข้อความ, Content, SMTP
│   │   │   ├── BlogFormFields.tsx     ← ImageUrlOrFileField (มี subdir prop, ใช้ร่วมกับ installer edit) + ContentImageInserter
│   │   │   └── installers/[id]/
│   │   │       ├── page.tsx           ← Server Component (admin check) — Phase 19
│   │   │       └── EditInstallerClient.tsx  ← ฟอร์มแก้ไขผู้ติดตั้งแบบเต็ม — Phase 19
│   │   ├── sitemap.ts                 ← dynamic sitemap (installers + blogs)
│   │   └── robots.ts
│   ├── app/api/                       ← Next.js Route Handlers (แทน Express)
│   │   ├── auth/...                   ← register, login, logout, me, forgot/reset, OAuth × 4
│   │   ├── installers/...
│   │   ├── blogs/...
│   │   ├── installer/...              ← protected installer routes
│   │   ├── admin/
│   │   │   └── installers/[id]/
│   │   │       ├── route.ts           ← GET/PUT แก้ไขข้อมูลผู้ติดตั้งแบบเต็ม (merge-safe) — Phase 19
│   │   │       └── claim/route.ts     ← PUT ส่งมอบบัญชี (เปลี่ยนอีเมล + สร้าง temp password + ส่งอีเมล) — Phase 19
│   │   └── ...
│   ├── components/
│   │   ├── layout/                    ← Navbar.tsx, NavbarClient.tsx, Footer.tsx
│   │   ├── installer/                 ← InstallerCard, InstallersClient, ReviewForm
│   │   ├── blog/                      ← BlogCard, BlogListClient, BlogContent
│   │   ├── calculator/                ← CalculatorWizard.tsx (6 steps)
│   │   ├── dashboard/                 ← DashboardClient
│   │   ├── admin/                     ← AdminClient
│   │   └── ui/                        ← Button, Input, Modal, Badge
│   ├── lib/
│   │   ├── db.ts                      ← better-sqlite3 singleton → G:\SolarPanel\solarpanel.db
│   │   ├── auth.ts                    ← JWT sign/verify (jose) + httpOnly cookie
│   │   ├── email.ts                   ← nodemailer wrapper + 5 email builders
│   │   ├── upload.ts                  ← saveFile/deleteFile → G:\SolarPanel\uploads\
│   │   ├── oauth.ts                   ← OAuth state store + PKCE helpers
│   │   ├── rate-limit.ts
│   │   └── sanitize.ts
│   ├── middleware.ts                   ← route protection (/dashboard, /admin)
│   ├── proxy.ts                        ← protection logic
│   ├── types/index.ts                  ← TypeScript types ทุก table
│   ├── .env.local                      ← JWT_SECRET, SMTP_USER, SMTP_PASS, NEXT_PUBLIC_APP_URL
│   ├── next.config.ts
│   └── package.json
├── uploads/                           ← ไฟล์อัปโหลด (shared)
│   ├── logos/                         ← โลโก้ผู้ติดตั้ง
│   ├── portfolio/                     ← รูปผลงาน
│   ├── calc/                          ← PDF ผลคำนวณ
│   ├── site/                          ← โลโก้เว็บ + Hero bg + Installers header
│   ├── blog/                          ← รูปปกบทความ
│   └── featured/                      ← รูป featured sections
├── solarpanel.db                      ← SQLite database
├── solarpanel.db-shm
├── solarpanel.db-wal
└── SolarPanel-Requirements.md
```

### Component Pattern ต่อหน้า (Next.js)

| Route | Pattern |
|-------|---------|
| `/` | Server Component — fetch DB ตรง, hydrate client |
| `/installers` | Server fetch (ISR 60s) + `InstallersClient` (filter/sort client-side) |
| `/installers/[id]` | SSG + ISR 300s + `ReviewSection` Client |
| `/blog` | Server + `BlogListClient` (filter client-side) |
| `/blog/[slug]` | SSG (generateStaticParams) |
| `/calculator` | Client Component (6-step wizard) |
| `/contact` | Server Action form |
| `/login`, `/register` | Client Components |
| `/dashboard` | Server (auth check) + `DashboardClient` |
| `/admin` | Server (admin check) + `AdminClient` |

---

## เทคโนโลยีที่ใช้จริง

| Layer      | เทคโนโลยี |
|------------|-----------|
| Framework  | Next.js 16.1.7 (App Router) |
| Language   | TypeScript |
| Styling    | Tailwind CSS 4 |
| Database   | SQLite (`solarpanel.db`) via better-sqlite3 |
| Auth       | Custom JWT (jose) — httpOnly Cookie |
| API        | Next.js Route Handlers (ใน `app/api/`) |
| Email      | Nodemailer + Gmail SMTP |
| File upload | native `request.formData()` → `lib/upload.ts` |
| SEO        | Metadata API + `app/sitemap.ts` + `app/robots.ts` |
| Analytics  | GA4 + Microsoft Clarity (next/script) |
| Dev server | Next.js port 3000 (1 terminal เท่านั้น) |

---

## โทนสีและดีไซน์ (ที่ใช้จริงใน styles.css)

| CSS Variable      | ค่า         | RGB Component Variable    | ใช้สำหรับ                          |
|-------------------|-------------|---------------------------|-------------------------------------|
| `--primary`       | `#0262EC`   | `--primary-rgb: 2,98,236` | สีหลัก (blue)                      |
| `--primary-dark`  | `#052477`   | —                         | สีหลักเข้ม, footer background       |
| `--secondary`     | `#0282FB`   | `--secondary-rgb: 2,130,251` | Gradient, hover                  |
| `--sun-dark`      | `#FD6902`   | `--sun-dark-rgb: 253,105,2` | เน้น (orange)                     |
| `--soft-gold`     | `#D4AF37`   | `--soft-gold-rgb: 212,175,55` | ปุ่ม secondary (btn-secondary)  |
| `--text`          | `#052477`   | —                         | ข้อความหลัก                        |
| `--muted`         | `#041D5A`   | —                         | ข้อความรอง                         |
| `--border`        | `#c8e6e1`   | —                         | เส้นขอบ                            |
| `--bg`            | `#f0f9f8`   | —                         | พื้นหลัง page                      |
| `--surface`       | `#ffffff`   | —                         | พื้นหลัง card/surface              |
| `--shadow`        | `rgba(var(--primary-rgb), 0.1)` | — | box-shadow กลาง         |

**Header:** `background: rgba(255,255,255,0.96)` + `backdrop-filter: blur(10px)` + `position: sticky`  
**Responsive breakpoints:** 1200px, 900px, 768px, 680px, 480px

---

## หน้า index.html — ส่วนต่างๆ

### Navigation (เมนูภาษาไทย)
```
รายชื่อผู้ติดตั้ง | คำนวณราคา | ทำไมต้องเรา | ติดต่อเรา
```
- `position: sticky; top: 0` — ติดบนหน้าจอตลอดเวลา
- "คำนวณราคา" → ลิงก์ไป `calculator.html` (แยกหน้า)
- "ติดต่อเรา" → ลิงก์ไป `contact.html` (แยกหน้า — Phase 7)

### Section 1: Hero
- Headline + subheadline + CTA buttons
- ปุ่ม "ค้นหาผู้ติดตั้ง" → `#directory`
- ปุ่ม "เริ่มคำนวณทันที" → `calculator.html`

### Section 2: Directory — รายชื่อผู้ติดตั้ง (`#directory`)
- ช่องค้นหา (filter by name/location แบบ real-time ผ่าน `script.js`)
- แสดง installer cards 12 ราย
- แต่ละ card: ชื่อ, คำอธิบาย, พื้นที่, ดาว, ปุ่ม "ดูรายละเอียด" → `installer-detail.html?id=N`

### Section 3: Calculator (widget mount)
- `<div id="calculator-mount">` — `calculator-widget.js` inject HTML เข้ามา
- Logic และ UI เหมือนกับ `calculator.html` ทุกประการ (shared widget)

### Section 4: ทำไมต้องเรา (`#featured`)
- 3 stat cards: รวบรวมผู้ติดตั้ง / เปรียบเทียบง่าย / คำนวณทันที

### Section 5: บทความแนะนำ (`#home-blogs`) — Phase 10
- ดึงข้อมูลจาก `GET /api/blogs/featured` — blogs ที่ admin mark ว่า featured สูงสุด 4 อัน
- Grid 4 คอลัมน์ (responsive: 2 คอลัมน์ที่ ≤1100px / 1 คอลัมน์ที่ ≤600px)
- แต่ละ card: รูป cover (aspect-ratio 16/9), category badge, title (ลิงก์ → blog-post.html?slug=...), excerpt (clamp 3 บรรทัด), ผู้เขียน + วันที่
- ปุ่ม "📰 อ่านบทความทั้งหมด →" ลิงก์ไป `blog.html`
- ถ้าไม่มีบทความ featured → ซ่อน section (ไม่แสดง placeholder)

### Section 6: ติดต่อเรา — CTA Block (Phase 7)
- **เดิม:** ฟอร์มขอใบเสนอราคาฝังตรงนี้ → **ย้ายออกไปที่ `contact.html`**
- **ใหม่:** CTA section สั้นๆ — ข้อความชวนติดต่อ + ปุ่ม "ติดต่อเรา →" ที่ลิงก์ไป `contact.html`
- ลบ `<section id="contact">` ที่มีฟอร์มออก แทนที่ด้วย CTA block เรียบง่าย

---

## หน้า contact.html — ติดต่อเรา (Phase 7 → อัปเดต Phase 9)

URL: `http://localhost:8080/contact.html`

### วัตถุประสงค์
ฟอร์มติดต่อทีมงาน Solar Panel Thailand โดยตรง — ข้อความถูกส่งเป็นอีเมลไปยัง support email ที่ตั้งค่าไว้ และบันทึกลง `contact_messages` table เพื่อให้ Admin ดูได้

> Phase 7: แยกฟอร์มออกจาก index.html มาเป็นหน้าเฉพาะ  
> Phase 9: เปลี่ยนจากฟอร์มขอใบเสนอราคา (Lead) เป็นฟอร์มติดต่อทีมงาน (Contact Message)

### Layout
- **Header/Nav:** เหมือนทุกหน้า — "ติดต่อเรา" มี `.nav-active` highlight
- **Page Header:** breadcrumb (หน้าแรก › ติดต่อเรา) + title + subtitle
- **Contact Grid (2 คอลัมน์):**
  - ซ้าย: ฟอร์มติดต่อ (card)
  - ขวา: ข้อมูลติดต่อ — แสดง support email แบบ dynamic
- **Footer:** เหมือน index.html

### ฟอร์มติดต่อ (Phase 9 → อัปเดต Phase 10)
- ชื่อผู้ติดต่อ (required)
- อีเมล (required)
- เบอร์โทร (required)
- **หัวข้อ** (required) — dropdown: ขอใบเสนอราคา / ต้องการสอบถาม / แจ้งปัญหา / อื่นๆ
- ข้อความ (required, textarea)
- ปุ่ม "ส่งข้อความ"

### ข้อมูลติดต่อ (Contact Info Card)
- 📍 พื้นที่บริการ: ทั่วประเทศ
- ✉️ อีเมล: แสดง `support_email` จาก `/api/content` แบบ dynamic
- ลิงก์ไป `installers.html` สำหรับผู้ต้องการขอใบเสนอราคา

### JS (inline)
- โหลด `support_email` จาก `GET /api/content` แสดงใน Contact Info card
- POST ไปที่ `http://localhost:3000/api/contact-message` (JSON)
- แสดง success/error feedback
- `trackEvent('contact_submit', ...)` เมื่อส่งสำเร็จ

### เชื่อมโยงกับหน้าอื่น
- **index.html** → CTA block ปุ่มลิงก์ไป `contact.html`
- **nav-component.js** → "ติดต่อเรา" ชี้ไป `contact.html`
- `.nav-active` highlight เมื่ออยู่ที่ `contact.html`

---

## หน้า installers.html — รายชื่อผู้ติดตั้งทั้งหมด (ใหม่)

URL: `http://localhost:8080/installers.html`

### วัตถุประสงค์
หน้าเดียวสำหรับค้นหาและกรองผู้ติดตั้งทั้งหมด แยกออกจาก index.html เพื่อ UX ที่ดีขึ้น

### Layout
- **Header/Nav:** เหมือนทุกหน้า — "รายชื่อผู้ติดตั้ง" มี `.nav-active` highlight
- **Page Header:** gradient teal + breadcrumb (หน้าแรก › รายชื่อผู้ติดตั้ง) + title + subtitle
- **Filter Bar:** search input, dropdown จังหวัด, dropdown rating, dropdown ประสบการณ์, dropdown เรียงโดย, ปุ่ม "ล้าง"
- **Result Count:** แสดง "แสดง X จาก 12 ราย"
- **Installer Grid:** card แบบ rich (แสดง rating, stars, stats, experience, ปุ่ม detail)
- **Empty State:** ข้อความ "ไม่พบผู้ติดตั้ง" เมื่อผลลัพธ์ว่าง

### Filter Bar

```
[ 🔍 ค้นหา... ] [ 📍 จังหวัด ▼ ] [ ⭐ Rating ▼ ] [ 🏆 ประสบการณ์ ▼ ] [ เรียงโดย ▼ ] [✕ ล้าง]
แสดง X จาก 12 ราย
```

**Dropdown จังหวัด:** สร้าง dynamic จาก `location` field ของทุก installer (ไม่ hardcode)

**Dropdown Rating:** ทั้งหมด / 4.5+ / 4.8+ / 5.0 เท่านั้น

**Dropdown ประสบการณ์:** ทั้งหมด / 5 ปีขึ้นไป / 8 ปีขึ้นไป / 10 ปีขึ้นไป

**Dropdown เรียงโดย:** แนะนำ (rating × log(reviews)) / Rating สูงสุด / ประสบการณ์มากสุด / โครงการมากสุด

### Installer Card (rich)
แต่ละ card แสดง: โลโก้บริษัท (หรือ site logo grayscale เป็น placeholder) + ชื่อ + badge "✓ ตรวจสอบแล้ว" (อยู่ใต้ชื่อ), พื้นที่, ดาว + rating + จำนวนรีวิว, stats (โครงการ / kW / satisfaction%), ประสบการณ์, ปุ่ม "ดูรายละเอียด" (ไม่มีลูกศร, font-size 0.75rem)

### JS — installers.js
- IIFE ครอบทั้งหมด (ไม่ pollute global)
- `applyFilters()` — filter AND condition ทุก input, sort, render
- Province dropdown สร้าง dynamic จาก `getAllInstallers()`
- Recommended sort: `rating × log(reviews + 1)`

### หมายเหตุ
- `body` ไม่มี special class (ไม่ต้องซ่อน section heading)
- แก้ไข card → แก้ที่ `installers.js` เท่านั้น

### เชื่อมโยงกับหน้าอื่น
- **index.html** → มีปุ่ม "ดูผู้ติดตั้งทั้งหมด พร้อมค้นหาและกรอง →" ใต้ directory preview section
- **nav-component.js** → "รายชื่อผู้ติดตั้ง" ชี้ไปที่ `installers.html` (เปลี่ยนจาก `#directory`)
- `.nav-active` highlight เมื่ออยู่ที่ `installers.html` หรือ `installer-detail.html`

---

## หน้า calculator.html — คำนวณราคา

URL: `http://localhost:8080/calculator.html`

### Layout
- **Header/Nav:** เหมือน index.html — "คำนวณราคา" มี `.nav-active` highlight
- **Page Header:** breadcrumb (หน้าแรก › คำนวณราคา) + title + subtitle
- **Calculator Widget:** `<div id="calculator-mount">` รับ inject จาก `calculator-widget.js`
- **CTA Section:** พื้นหลัง teal gradient — ปุ่ม "ดูรายชื่อผู้ติดตั้ง" → `installers.html`
- **Footer:** เหมือน index.html

### หมายเหตุการ Reuse
- `body class="page-calc"` ทำให้ CSS ซ่อน `.section-heading` ภายใน widget (เพราะ page header แสดงชื่อแล้ว)
- แก้ไข calculator → แก้ที่ `calculator-widget.js` ไฟล์เดียว มีผลทั้ง 2 หน้า

---

## หน้า installer-detail.html — รายละเอียดผู้ติดตั้ง

เปิดผ่าน `installer-detail.html?id=1` ถึง `?id=12`  
โหลดข้อมูลจาก `GET /api/installers/:id` (inline JS — fetch API)

### Layout
- **Breadcrumb:** หน้าแรก › รายชื่อผู้ติดตั้ง › ชื่อบริษัท
- **Hero Banner:** โลโก้ + verified badge + ข้อมูลหลัก
- **Body:** 2 คอลัมน์ (main content + sidebar sticky)
- **Bottom CTA:** แถบสีเขียวปิดท้าย

### Hero Banner — Trust Elements
1. **Company Logo** — icon + verified checkmark สีเขียว (✓)
2. **ดาว Visual** (★★★★★) แสดง rating จริง
3. **Trust Badge Strip:**
   - ✓ ตรวจสอบแล้ว (สีเขียว)
   - ⭐ X+ ปีประสบการณ์ (สีทอง)
   - 📜 ISO Certified (สีน้ำเงิน)
   - 🛡️ มีประกันงาน
   - ก่อตั้ง YYYY
4. **Quick Stats Row** (4 ช่อง):
   - โครงการที่ผ่านมา (total_projects)
   - kW ติดตั้งสะสม (total_kw)
   - ปีประสบการณ์ (experience)
   - % ลูกค้าพึงพอใจ (satisfaction_rate)

### Sidebar Contact Card (sticky)
- เบอร์โทร, อีเมล, พื้นที่บริการ, LINE ID
- ⚡ แสดงเวลาตอบกลับ (response_time)
- 🌐 เว็บไซต์บริษัท (แสดงเฉพาะเมื่อ `website_url` มีข้อมูล — Phase 17)
- 📘 Facebook (แสดงเฉพาะเมื่อ `facebook_url` มีข้อมูล — Phase 17)
- 🎵 TikTok (แสดงเฉพาะเมื่อ `tiktok_url` มีข้อมูล — Phase 17)
- ปุ่ม: **ขอใบเสนอราคาฟรี** (teal) / **ติดต่อทาง LINE** (green) / **โทรหาเลย** (outline)
- `lineBtn.href` → `https://line.me/R/ti/p/{line_id}`
- `callBtn.href` → `tel:{phone}` (ลบ `-` ออก)

### Main Content Sections
| Section | รายละเอียด |
|---------|-----------|
| 🏢 เกี่ยวกับบริษัท | `about` text |
| 🔧 บริการของเรา | `services[]` list พร้อม ✓ icon |
| 📜 ใบรับรองและมาตรฐาน | `certifications[]` พร้อม 🏆 icon |
| 🛡️ การรับประกัน | 3 cards: แผงโซลาร์ / อินเวอร์เตอร์ / งานติดตั้ง |
| 📋 โครงการที่ผ่านมา | `projects[]` — ชื่อ + savings badge |
| ▶ วิดีโอแนะนำ | YouTube embed แบบ responsive 16:9 — แสดงเฉพาะเมื่อ `youtube_url` มีข้อมูล (Phase 17) |
| ⭐ รีวิวจากลูกค้าจริง | Rating breakdown + รีวิว + ปุ่ม "✏️ เขียนรีวิว" + Slider CAPTCHA (Phase 16) |
| ❓ FAQ | 4 ข้อ accordion เปิด/ปิด (global ไม่ขึ้นกับ installer) |

### Review Flow (Phase 16 — Slider CAPTCHA)

```
กดปุ่ม "✏️ เขียนรีวิว"
  → เปิด Review Modal (กรอกข้อมูล)
  → กด "ส่งรีวิว"
    → validate: rating, ชื่อ, อีเมล, รายละเอียด ≥ 20 ตัว
    → เปิด Captcha Modal (ทับบน Review Modal)
      ┌─────────────────────────────────────────────────────────┐
      │ 🔒 ยืนยันตัวตน                                          │
      │ เลื่อนแถบไปทางขวาสุดเพื่อยืนยันว่าคุณไม่ใช่บอต          │
      │  [ ›────────────────────────── เลื่อนเพื่อยืนยัน → ] │
      └─────────────────────────────────────────────────────────┘
      → ลากถึงปลาย → แถบเปลี่ยนเป็นสีเขียว "✓ ยืนยันสำเร็จ"
      → Modal ปิดอัตโนมัติ → POST /api/reviews
    → ถ้าปล่อยก่อนถึงปลาย → slider snap กลับ ต้องเลื่อนใหม่
```

**Implementation (pure vanilla JS, ไม่ใช้ library):**
- CSS: `.captcha-track`, `.captcha-fill`, `.captcha-handle`, `.captcha-track-label`
- Events: `mousedown`/`mousemove`/`mouseup` + `touchstart`/`touchmove`/`touchend`
- Threshold: `x >= trackWidth - handleWidth - 6` → `confirmCaptcha()`
- Success animation: handle เปลี่ยน background เป็น `var(--primary)` + "✓", label "✓ ยืนยันสำเร็จ" สีขาว
- หลัง 650ms: `closeCaptcha()` → `doSubmitReview(body, name, email, date)`

---

## โครงสร้างข้อมูล Installer (API Response)

ข้อมูลดึงจาก `GET /api/installers` และ `GET /api/installers/:id` (SQLite DB)

### Installer Object (ทุก field)

```js
{
  id: Number,                   // 1–12
  name: String,                 // ชื่อบริษัท
  description: String,          // คำอธิบายสั้น "ชื่อ | พื้นที่"
  experience: Number,           // จำนวนปีประสบการณ์
  founded_year: Number,         // ปีก่อตั้ง (2026 - experience)
  rating: Number,               // 4.5–5.0
  reviews: Number,              // จำนวนรีวิวทั้งหมด
  total_projects: Number,       // โครงการที่ผ่านมา
  total_kw: Number,             // kW ติดตั้งสะสม
  satisfaction_rate: Number,    // % ลูกค้าพึงพอใจ (93–99)
  phone: String,                // "0X-XXX-XXXX"
  email: String,
  line_id: String,              // "@xxx"
  youtube_url: String | null,   // YouTube video URL (Phase 17)
  tiktok_url: String | null,    // TikTok profile URL (Phase 17)
  facebook_url: String | null,  // Facebook page URL (Phase 17)
  website_url: String | null,   // company website URL (Phase 17)
  response_time: String,        // "ภายใน X ชั่วโมง"
  location: String,             // จังหวัดที่ให้บริการ — แสดงในการ์ด (Phase 19: sync ค่าเดียวกับ service_provinces เสมอ กันสับสน)
  service_provinces: String,    // จังหวัดที่ให้บริการ (JSON array หรือ comma-separated text) — ตัวขับเคลื่อนการค้นหา/filter จริงบน /installers (Phase 19)
  must_change_password: Number, // 0/1 — บังคับเปลี่ยนรหัสผ่านตอน login ครั้งแรกหลังถูก "ส่งมอบบัญชี" (Phase 19)
  claimed_at: String | null,    // วันที่ Admin ส่งมอบบัญชีล่าสุด — null ถ้ายังไม่เคยส่งมอบ (Phase 19)
  warranty_panel: String,       // "25 ปี"
  warranty_inverter: String,    // "10 ปี" หรือ "12 ปี"
  warranty_workmanship: String, // "2–5 ปี"
  about: String,                // paragraph เกี่ยวกับบริษัท
  services: String[],           // รายการบริการ 4 รายการ
  certifications: String[],     // ใบรับรอง 2–3 รายการ
  projects: [                   // โครงการอ้างอิง
    { name: String, savings: String }
  ],
  reviews_sample: [             // รีวิวลูกค้า 3 รายการ
    { name: String, rating: Number, comment: String, date: String }
  ]
}
```

### ข้อมูล 12 ผู้ติดตั้ง (สรุป)

| ID | ชื่อ | พื้นที่ | ประสบการณ์ | Rating |
|----|------|---------|------------|--------|
| 1  | Eco Solar Pro | กรุงเทพฯ, ปริมณฑล | 8 ปี | 5.0 |
| 2  | Green Energy Tech | เชียงใหม่, ลำพูน | 5 ปี | 4.8 |
| 3  | Solar Master | ภาคใต้ (สงขลา) | 10 ปี | 5.0 |
| 4  | Bright Solar Solutions | กทม., นนทบุรี | 6 ปี | 4.9 |
| 5  | Sun Power Installation | ปทุมธานี, สมุทรปราการ | 7 ปี | 4.7 |
| 6  | Clean Energy Pro | ขอนแก่น, อุดรธานี | 4 ปี | 4.6 |
| 7  | Solar Vision Thailand | ชลบุรี, ระยอง | 9 ปี | 4.9 |
| 8  | Future Energy Systems | นครราชสีมา | 3 ปี | 4.5 |
| 9  | Golden Sun Installation | เชียงราย, เชียงใหม่ | 5 ปี | 4.8 |
| 10 | Tech Solar Thailand | พิษณุโลก | 6 ปี | 4.7 |
| 11 | Premier Solar Group | สงขลา, หาดใหญ่ | 8 ปี | 5.0 |
| 12 | Power Light Solutions | สุราษฎร์ธานี | 4 ปี | 4.6 |

---

## Calculator — ตรรกะการคำนวณ (calculator-widget.js)

> **แก้ไข calculator ทั้งหมดที่ `calculator-widget.js` ไฟล์เดียว**  
> มีผลกับทั้ง `index.html` และ `calculator.html` พร้อมกัน

### ขั้นตอนการกรอกข้อมูล (6 ขั้น)

| ขั้น | ฟิลด์ | รายละเอียด |
|------|-------|-----------|
| 1 | ค่าไฟต่อเดือน | Input + quick preset (1,500 / 2,500 / 4,000 / 7,000 บาท) |
| 2 | ค่าไฟต่อหน่วย | Input (default 4.50) + preset (3.50 / 4.00 / 4.50★ / 4.80) |
| 3 | ช่วงเวลาใช้ไฟ | Option cards: ☀️ กลางวัน / 🌙 กลางคืน / 🌓 ตลอดวัน |
| 4 | ขนาดระบบ (kW) | Input + badge "แนะนำ X kW" (คำนวณอัตโนมัติ) + preset (3 / 5 / 7 / 10 kW) |
| 5 | ประเภทระบบ | Option cards: 🔌 On-grid / ⚡ Hybrid |
| 6 | แบตเตอรี่ | Option grid 2×2: 🚫 ไม่มี / 🔋 5kWh / 🔋 10kWh / 🔋 15kWh |

### ค่าคงที่ในการคำนวณ

```js
HARDWARE_PER_KW = { ongrid: 40000, hybrid: 51000 }  // ค่าอุปกรณ์
LABOR_PER_KW    = { ongrid:  5000, hybrid:  7000 }  // ค่าแรงติดตั้ง
// รวม = 45,000 / 58,000 บาท/kW (เท่ากับราคาตลาดเดิม)

BATTERY_BONUS = { 0: 0, 50000: 10, 90000: 18, 125000: 25 }  // % เพิ่มประสิทธิภาพ

USAGE_TIME_BASE = { day: 85, night: 40, allday: 62 }  // % solar usage baseline

// แนะนำ kW: peak sun hours ไทย = 4.5 ชม./วัน, efficiency = 0.8
recommendedKw = (monthlyBill / unitPrice / 30 * coverage) / (4.5 * 0.8)
```

### สูตรคำนวณหลัก

```
hardwareCost     = systemSize × HARDWARE_PER_KW[type]
laborCost        = systemSize × LABOR_PER_KW[type]
totalInstall     = hardwareCost + laborCost + batteryCost

effectiveUsage   = min(100, timeBase + batteryBonus)
monthlySavings   = monthlyBill × (effectiveUsage/100) × 0.9
paybackMonths    = totalInstall / monthlySavings
```

### ผลลัพธ์ที่แสดง (summary card)

| รายการ | หมายเหตุ |
|--------|---------|
| 🔌 ค่าอุปกรณ์โซลาร์ | hardware cost แยกจากค่าแรง |
| 🔋 ค่าแบตเตอรี่ | ซ่อนถ้าไม่ได้เลือก |
| 👷 ค่าแรงติดตั้ง | labor cost แยกต่างหาก |
| 💡 รวมค่าติดตั้งทั้งหมด | highlight |
| 💰 ประหยัดต่อเดือน | |
| ⏱️ คืนทุนภายใน | แสดงเป็น "X ปี" หรือ "X เดือน" |

### Summary Card Background
- `background: linear-gradient(135deg, #d4eeeb 0%, #bfe5e0 100%)` — teal เข้ม

---

## Component Patterns ที่ใช้ซ้ำ

### Option Card
```html
<label class="option-card [selected]">
  <input type="radio" name="..." value="..." />
  <span class="option-card-icon">emoji</span>
  <div class="option-card-body">
    <div class="option-card-title">ชื่อ</div>
    <div class="option-card-desc">คำอธิบาย</div>
  </div>
  <span class="option-card-price">ราคา</span>
</label>
```
- `.option-cards` = grid ปกติ (1 คอลัมน์)
- `.battery-grid` = 2 คอลัมน์
- `.usage-time-cards` = 3 คอลัมน์
- JS: `bindOptionCards(groupId, onChangeFn)` handle highlight + calculate

### Quick Preset Buttons
```html
<div class="quick-presets">
  <span class="preset-label">label:</span>
  <button class="preset-btn" onclick="setX(val)">label</button>
</div>
```

### Trust Badge
```html
<span class="tbadge green">✓ ตรวจสอบแล้ว</span>
<span class="tbadge amber">⭐ X ปีประสบการณ์</span>
<span class="tbadge blue">📜 ISO Certified</span>
```

### Star Rating (Partial Fill)
แสดงดาวแบบ proportional — สีทองตามคะแนนจริง เช่น 4.7 = ทอง 94% + เทา 6%

```js
function starsHtml(rating) {
  const pct = (rating / 5 * 100).toFixed(1);
  return `<span style="position:relative;display:inline-block;white-space:nowrap;letter-spacing:0.05em">
    <span style="color:#ccc">★★★★★</span>
    <span style="position:absolute;top:0;left:0;overflow:hidden;width:${pct}%;color:#f5a623;white-space:nowrap">★★★★★</span>
  </span>`;
}
```

- ใช้ CSS overlay: ดาวสีเทา (`#ccc`) เป็นฐาน ทับด้วยดาวทอง (`#f5a623`) ที่ตัด `overflow:hidden` + `width = rating/5 × 100%`
- ใช้ function เดียวกันทั้ง 3 จุด: `index.html`, `installers.js`, `installer-detail.html`
- ไม่ใช้ class — inline style ทั้งหมดเพื่อให้ใช้ได้ทุกที่

### Page Header (calculator.html pattern)
```html
<div class="page-header">
  <div class="container">
    <nav class="breadcrumb">...</nav>
    <p class="page-header-eyebrow">...</p>
    <h1 class="page-header-title">...</h1>
    <p class="page-header-sub">...</p>
  </div>
</div>
```

---

## ข้อมูลอ้างอิงสำหรับการคำนวณ

| รายการ | ค่า | หมายเหตุ |
|--------|-----|---------|
| On-grid hardware | 40,000 บาท/kW | ราคาอุปกรณ์ |
| On-grid labor | 5,000 บาท/kW | ค่าแรงติดตั้ง |
| On-grid รวม | 45,000 บาท/kW | ราคาตลาดเฉลี่ย 2025-2026 |
| Hybrid hardware | 51,000 บาท/kW | |
| Hybrid labor | 7,000 บาท/kW | |
| Hybrid รวม | 58,000 บาท/kW | เพิ่ม ~29% จาก On-grid |
| แบตฯ 5 kWh | 50,000 บาท | LiFePO4 รวมติดตั้ง |
| แบตฯ 10 kWh | 90,000 บาท | |
| แบตฯ 15 kWh | 125,000 บาท | |
| Peak sun hours | 4.5 ชม./วัน | เฉลี่ยทั่วประเทศไทย |
| System efficiency | 80% | รวม inverter loss |
| ค่าไฟ MEA (กทม.) | ~4.50 บาท/หน่วย | อ้างอิงปี 2567 |
| ค่าไฟ PEA (ต่างจังหวัด) | ~4.20 บาท/หน่วย | |

---

## FAQ ที่ฝังในหน้า Detail (global)

1. ใช้เวลาติดตั้งนานแค่ไหน? → 1–3 วันทำการ
2. ต้องเตรียมอะไรบ้างก่อนติดตั้ง? → หลังคาแข็งแรง + สำรวจฟรี
3. หลังติดตั้งแล้วดูแลยากไหม? → ทำความสะอาดปีละ 1–2 ครั้ง
4. ค่าไฟจะลดได้มากแค่ไหน? → เฉลี่ย 60–80% บางรายได้ >90%

---

## สิ่งที่ยังไม่ได้ทำ / แผนอนาคต

- [x] Backend จริง (Node.js / PHP) — ✅ Phase 1
- [x] ระบบ Login / Dashboard สำหรับผู้ติดตั้ง — ✅ Phase 2
- [x] ระบบกรองผู้ติดตั้งตามจังหวัด / rating — ✅ Phase 3
- [x] ระบบรีวิวจริงที่ผู้ใช้กรอกได้ — ✅ Phase 4
- [x] แผนที่, Blog, SEO, Analytics — ✅ Phase 5
- [x] ระบบลงทะเบียนผู้ติดตั้งใหม่ — ✅ Phase 2
- [x] Admin Panel สำหรับจัดการระบบทั้งหมด — ✅ Phase 6
- [x] Contact Page แยกหน้า — ✅ Phase 7
- [x] Quote Request + Lead Attachment PDF — ✅ Phase 8
- [x] Support / Contact Messages — ✅ Phase 9
- [x] Featured Blogs on Homepage — ✅ Phase 10
- [x] **Site Logo Upload + Blog Cover Image + Dynamic Favicon** — ✅ Phase 11
- [x] **Social Login (OAuth: Google/Facebook/X/TikTok) + Auth Pages + Social Auth Admin Panel** — ✅ Phase 15
- [x] **Blog Content Import (40 posts จาก xlsx) + Map z-index Fix + Slider CAPTCHA anti-spam** — ✅ Phase 16
- [x] **YouTube / TikTok / Facebook / Website URL สำหรับผู้ติดตั้ง (Dashboard + installer-detail)** — ✅ Phase 17
- [x] **Email Templates Tab ใน Admin Panel + Site Logo แสดงใน Email อัตโนมัติจาก Settings** — ✅ Phase 18
- [x] **Admin: ส่งมอบบัญชีผู้ติดตั้งให้เจ้าของจริง (เปลี่ยนอีเมล + ส่งรหัสผ่านชั่วคราวทางอีเมล + บังคับเปลี่ยนรหัสผ่านตอน login ครั้งแรก)** — ✅ Phase 19 (Next.js)
- [x] **Admin: หน้าแก้ไขข้อมูลผู้ติดตั้งแบบเต็ม (`/admin/installers/:id`)** — ✅ Phase 19 (Next.js)
- [x] **แก้ไขความไม่สอดคล้องของพื้นที่ให้บริการ — service_provinces เป็นตัวขับเคลื่อนการค้นหา/filter บน `/installers` จริง (รองรับทั้ง JSON array และข้อความ comma-separated ของข้อมูลเก่า) + แก้บั๊ก services/certifications ไม่แสดงผลในหน้า detail สำหรับข้อมูลที่ import แบบ plain text** — ✅ Phase 19 (Next.js)
- [x] **Favicon แบบ Dynamic จากโลโก้เว็บใน Settings** — ✅ Phase 19 (Next.js)
- [ ] แชร์ผลคำนวณเป็น PDF หรือ LINE

---

## Roadmap Overview

| Phase | ฟีเจอร์ | Priority | Effort | สถานะ |
|-------|---------|----------|--------|-------|
| 1 | Backend + Contact Form จริง | High | M | ✅ Done |
| 2 | Installer Login / Dashboard | High | L | ✅ Done |
| 3 | Filter จังหวัด / Rating | Medium | S | ✅ Done |
| 4 | ระบบรีวิวจริง | Medium | M | ✅ Done |
| 4.5 | Auto-Project จาก Lead | Medium | S | ✅ Done |
| 4.6 | Portfolio Gallery ผู้ติดตั้ง | Medium | S | ✅ Done |
| 4.7 | Profile Views Counter | Medium | S | ✅ Done |
| 5A | แผนที่พื้นที่บริการ (Leaflet.js) | Low–Medium | S | ✅ Done |
| 5A.1 | Location Autocomplete (Nominatim) ใน Dashboard | Low–Medium | S | ✅ Done |
| 5B | Blog / บทความ (blog.html + blog-post.html + Admin CRUD) | Low–Medium | M | ✅ Done |
| 5C | SEO + Structured Data | Medium | S | ✅ Done |
| 5C.1 | AI Search Optimization (FAQPage, llms.txt, AI bots) | Medium | S | ✅ Done |
| 5D | Analytics (GA4 + Clarity) | Low–Medium | S | ✅ Done |
| 5D.1 | Analytics Settings UI (Admin ตั้งค่า GA4/Clarity ID) | Medium | S | ✅ Done |
| 6A | Admin Login (email/password + role) | High | S | ✅ Done |
| 6B | Installer Management UI (approve/reject/suspend/reactivate + edit) | High | S | ✅ Done |
| 6B.1 | Registration Mode Setting (Auto / Approve by Admin) | Medium | S | ✅ Done |
| 6C | Review Management UI (approve/reject) | High | S | ✅ Done |
| 6D | Lead Management UI (global view + assign) | Medium | S | ✅ Done |
| 6E | Content Management (แก้ไข content หน้าแรก) | Medium | M | ✅ Done |
| 6F | Admin Overview Dashboard (stats + summary) | Medium | S | ✅ Done |
| 7 | Contact Page — ย้ายฟอร์มติดต่อจาก index.html → contact.html | Medium | S | ✅ Done |
| 8 | Quote Request + Calc Data + Lead Attachment PDF | Medium | M | ✅ Done |
| 9 | Support / Contact Messages (Admin inbox + status) | Medium | S | ✅ Done |
| 10 | Featured Blogs on Homepage (featured toggle + index.html section) | Medium | S | ✅ Done |
| **11** | **Site Logo Upload (Admin → ตั้งค่า) + Blog Cover Image + Dynamic Favicon** | Medium | S | **✅ Done** |
| **12** | **PDF Improvements + Calculator Prices จาก Admin** | High | M | **✅ Done** |
| **13** | **Page Header Theme (สี + รูปพื้นหลัง) จาก Admin** | Medium | S | **✅ Done** |
| **14** | **Installer Card UI + installers_header_image แยกจาก Hero** | Medium | S | **✅ Done** |
| **15** | **Social Login (OAuth) + Auth Pages (forgot/reset password) + Social Auth Admin Panel** | High | M | **✅ Done** |
| **16A** | **Blog Content Import — 40 posts จาก Blog Content.xlsx พร้อม categories, tags, metadata** | Medium | S | **✅ Done** |
| **16B** | **Bug Fixes: Map z-index + Review modal crash + Slider CAPTCHA anti-spam** | Medium | S | **✅ Done** |
| **17** | **YouTube / TikTok / Facebook / Website URL — Dashboard input + installer-detail display** | Medium | S | **✅ Done** |
| **18** | **Email Templates Tab ใน Admin + Site Logo ใน Email อัตโนมัติ** | Medium | S | **✅ Done** |
| **19A** | **Admin: ส่งมอบบัญชีผู้ติดตั้งให้เจ้าของ (Claim Account) — เปลี่ยนอีเมล + ส่ง temp password + บังคับเปลี่ยนรหัสผ่านครั้งแรก (Next.js)** | High | M | **✅ Done** |
| **19B** | **Admin: หน้าแก้ไขข้อมูลผู้ติดตั้งแบบเต็ม `/admin/installers/:id` (Next.js)** | High | M | **✅ Done** |
| **19C** | **แก้ความสอดคล้องพื้นที่ให้บริการ (service_provinces ขับเคลื่อนการค้นหาจริง) + แก้บั๊ก services/certifications ไม่แสดงผลสำหรับข้อมูล plain-text (Next.js)** | Medium | S | **✅ Done** |
| **19D** | **Favicon แบบ Dynamic จากโลโก้เว็บ (Next.js)** | Low | S | **✅ Done** |
| — | แชร์ผลคำนวณเป็น PDF หรือ LINE | Low | M | Pending |

---

## Phase 1 — Backend จริง + Contact Form

> Priority: **High** | Effort: **M** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
เชื่อมต่อฟอร์มขอใบเสนอราคา (`#contact`) ให้ส่งข้อมูลจริงไปยัง server และแจ้งเตือนผู้ดูแลระบบ

### Stack ที่เลือก
- **Runtime:** Node.js + Express.js (ใช้ `backend/node/server.js` ที่มีอยู่เป็นฐาน)
- **Database:** SQLite (dev) → PostgreSQL (prod)
- **Email:** Nodemailer + Gmail SMTP หรือ SendGrid
- **Hosting:** Railway / Render (free tier)

### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| B-01 | ลูกค้า | กรอกฟอร์มขอใบเสนอราคาแล้วส่งได้จริง | ผู้ติดตั้งได้รับข้อมูลติดต่อกลับ |
| B-02 | ลูกค้า | ได้รับ email ยืนยันหลังส่งฟอร์ม | มั่นใจว่าส่งสำเร็จ |
| B-03 | Admin | รับ email แจ้งเตือนทุกครั้งที่มี lead ใหม่ | ติดตาม lead ได้ทันที |
| B-04 | Admin | ดู lead ทั้งหมดในระบบได้ | จัดการ lead ได้ง่าย |

### API Endpoints

```
POST /api/contact          — ส่งฟอร์มขอใบเสนอราคา
GET  /api/leads            — ดู lead ทั้งหมด (Admin only, JWT)
GET  /api/health           — health check
```

### Request Body — POST /api/contact

```json
{
  "name": "string (required, max 100)",
  "email": "string (required, email format)",
  "phone": "string (required, Thai format 0X-XXX-XXXX)",
  "province": "string (required)",
  "message": "string (optional, max 1000)",
  "installer_id": "number (optional) — ถ้ามาจาก detail page"
}
```

### Response

```json
// 200 OK
{ "success": true, "message": "ส่งข้อมูลเรียบร้อยแล้ว" }

// 400 Bad Request
{ "success": false, "errors": ["email ไม่ถูกต้อง"] }

// 429 Too Many Requests
{ "success": false, "message": "ส่งได้สูงสุด 3 ครั้ง/ชั่วโมง" }
```

### Schema — ตาราง `leads`

```sql
CREATE TABLE leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  province    TEXT NOT NULL,
  message     TEXT,
  installer_id INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  status      TEXT DEFAULT 'new'  -- new | contacted | closed
);
```

### Validation Rules
- `name`: ต้องกรอก, 2–100 ตัวอักษร
- `email`: รูปแบบ email ถูกต้อง
- `phone`: ขึ้นต้นด้วย 0, 10 หลัก (รูปแบบไทย)
- `province`: ต้องกรอก
- Rate limit: IP เดิมส่งได้ 3 ครั้ง/ชั่วโมง (ป้องกัน spam)

### Frontend Changes
- เพิ่ม `action` และ `method` ใน form
- แสดง loading state ระหว่าง submit
- แสดง success message / error message แบบ inline (ไม่ใช้ alert)
- Disable ปุ่ม submit หลังส่งสำเร็จ

### Security
- CORS whitelist เฉพาะ domain จริง
- Helmet.js สำหรับ HTTP headers
- Input sanitization (strip HTML tags)
- Environment variables สำหรับ credentials (ห้าม hardcode)

### Implementation Notes (✅ Done)

**ไฟล์ที่สร้าง/แก้ไข:**
- `backend/node/server.js` — เขียนใหม่ทั้งหมด (Express + SQLite + Nodemailer + JWT + rate-limit)
- `backend/node/package.json` — dependencies จริง
- `backend/node/.env.example` — template env vars
- `index.html` — contact form ใช้ `fetch()` + inline feedback (แทน `<form action="...">`)
- `styles.css` — เพิ่ม `.contact-feedback--success / --error`

**Dependencies (backend/node):**
- `express` — HTTP server
- `better-sqlite3` — SQLite (sync, zero-config)
- `nodemailer ^8` — ส่ง email ผ่าน Gmail SMTP
- `helmet` — HTTP security headers
- `express-rate-limit` — rate limiting 3 req/hr/IP
- `jsonwebtoken` — JWT สำหรับ admin endpoint
- `dotenv` — โหลด .env

**ข้อสังเกต:**
- Email จะส่งได้จริงก็ต่อเมื่อกรอก `SMTP_USER` + `SMTP_PASS` ใน `.env` (ใช้ Gmail App Password)
- ถ้าไม่มี env email → ระบบยังรับ lead และบันทึก DB ได้ปกติ แค่ไม่ส่ง email
- `solarpanel.db` สร้างอัตโนมัติ ไม่ต้อง migrate แยก

---

## Phase 2 — ระบบ Login / Dashboard สำหรับผู้ติดตั้ง

> Priority: **High** | Effort: **L** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ผู้ติดตั้งมีบัญชีส่วนตัวเพื่อจัดการโปรไฟล์, ดู lead ที่เข้ามา, และอัปเดตข้อมูลได้เอง

### หน้าใหม่ที่ต้องสร้าง

| หน้า | URL | คำอธิบาย |
|------|-----|---------|
| ลงทะเบียน | `/register.html` | สมัครบัญชีผู้ติดตั้งใหม่ |
| เข้าสู่ระบบ | `/login.html` | Login ด้วย email + password |
| Dashboard | `/dashboard.html` | หน้าหลักหลัง login |
| แก้ไขโปรไฟล์ | `/dashboard.html#profile` | แก้ไขข้อมูลบริษัท |
| จัดการ Lead | `/dashboard.html#leads` | ดูและตอบกลับ lead |

### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| L-01 | ผู้ติดตั้งใหม่ | สมัครบัญชีด้วย email + password | ลงทะเบียนเป็นผู้ให้บริการ |
| L-02 | ผู้ติดตั้ง | Login เข้าระบบได้ | เข้าถึง dashboard ส่วนตัว |
| L-03 | ผู้ติดตั้ง | ดู lead ที่ลูกค้าส่งมาหาฉัน | ติดตามลูกค้าเป้าหมาย |
| L-04 | ผู้ติดตั้ง | แก้ไขข้อมูลบริษัท (ชื่อ, เบอร์, พื้นที่) | ข้อมูลใน directory ถูกต้องเสมอ |
| L-05 | ผู้ติดตั้ง | อัปโหลดรูปโลโก้บริษัท | โปรไฟล์ดูน่าเชื่อถือ |
| L-06 | Admin | Approve / Reject บัญชีผู้ติดตั้งใหม่ | ควบคุมคุณภาพข้อมูล directory |
| L-07 | ผู้ติดตั้ง | Reset password ผ่าน email | กู้คืนบัญชีได้เอง |

### Auth Flow
```
สมัคร → email verification → รอ Admin approve → Login ได้ → Dashboard
```

### API Endpoints

```
POST /api/auth/register       — สมัครบัญชี
POST /api/auth/login          — login → return JWT
POST /api/auth/logout         — invalidate token
POST /api/auth/forgot-password
POST /api/auth/reset-password

GET  /api/installer/me        — ดูโปรไฟล์ตัวเอง
PUT  /api/installer/me        — แก้ไขโปรไฟล์
POST /api/installer/logo      — อัปโหลดรูป

GET  /api/installer/leads     — ดู lead ที่เข้ามา
PUT  /api/leads/:id/status    — อัปเดตสถานะ lead

GET  /api/admin/installers    — (Admin) ดูรายการทั้งหมด
PUT  /api/admin/installers/:id/approve
```

### Schema — ตาราง `installers`

```sql
CREATE TABLE installers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  location      TEXT,
  about         TEXT,
  logo_url      TEXT,
  status        TEXT DEFAULT 'pending',  -- pending | active | suspended
  role          TEXT DEFAULT 'installer', -- installer | admin
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at   DATETIME
);
```

### Dashboard UI Sections
1. **Overview Cards** (5 การ์ด) — Lead ใหม่, Lead ทั้งหมด, ติดต่อแล้ว, ปิดงานแล้ว, ดูโปรไฟล์ทั้งหมด (Phase 4.7)
2. **Lead Table** — ชื่อ, จังหวัด, วันที่, สถานะ (new/contacted/closed), ปุ่ม action
3. **Profile Editor** — แก้ไขข้อมูลทุก field ใน installer object  
   - ช่อง **พื้นที่ให้บริการ** เป็น Location Autocomplete widget (Phase 5A.1) — ค้นหาจังหวัด/อำเภอ/ตำบล แสดง tag chips และบันทึก lat/lng อัตโนมัติ
4. **Account Settings** — เปลี่ยน password, จัดการ email notification

### Security
- Password: bcrypt (saltRounds = 12)
- JWT: expire 7 วัน
- Token เก็บใน `localStorage` (dev) — ส่งผ่าน `Authorization: Bearer` header
- ป้องกัน route ที่ต้องการ auth ด้วย middleware (`installerAuth` / `adminAuth`)

### Implementation Notes (✅ Done)

**ไฟล์ที่สร้าง/แก้ไข:**
- `backend/node/server.js` — เพิ่ม tables (`installers`, `password_resets`), routes ทั้งหมด, `installerAuth` + `adminAuth` middleware
- `backend/node/package.json` — เพิ่ม `bcryptjs`, `multer`
- `backend/node/.env.example` — ไม่มีการเปลี่ยนแปลง (ตัวแปรเดิมใช้ได้)
- `login.html` — หน้าเข้าสู่ระบบ + toggle password
- `register.html` — หน้าสมัครบัญชีผู้ติดตั้ง (2 คอลัมน์)
- `dashboard.html` — Dashboard 4 แท็บ: ภาพรวม, Lead, โปรไฟล์, ตั้งค่า
- `styles.css` — เพิ่ม auth styles (`.page-auth`, `.auth-card`, `.auth-form`) + dashboard styles (`.dash-layout`, `.dash-stat-grid`, `.dash-table`, badge, etc.)
- `nav-component.js` — เพิ่มปุ่ม "เข้าสู่ระบบ" / "Dashboard + ออก" ตาม auth state ใน `localStorage`
- `uploads/logos/` — สร้างอัตโนมัติโดย `server.js` เมื่อ start ครั้งแรก

**API ที่ implement แล้ว:**
```
POST /api/auth/register          — สมัครบัญชี (status: pending รอ Admin อนุมัติ)
POST /api/auth/login             — login → return JWT
POST /api/auth/forgot-password   — ส่ง reset link ทาง email
POST /api/auth/reset-password    — ตั้งรหัสผ่านใหม่ด้วย token
GET  /api/installer/me           — ดูโปรไฟล์ตัวเอง
PUT  /api/installer/me           — แก้ไขโปรไฟล์
POST /api/installer/logo         — อัปโหลดโลโก้ (multer → uploads/logos/)
PUT  /api/installer/password     — เปลี่ยนรหัสผ่าน
GET  /api/installer/leads        — ดู lead ที่เข้ามา
PUT  /api/leads/:id/status       — อัปเดตสถานะ lead
GET  /api/admin/installers       — (Admin JWT) ดูรายการผู้ติดตั้งทั้งหมด
PUT  /api/admin/installers/:id/approve — (Admin JWT) approve | reject | suspend
```

**CORS:** เพิ่ม `PUT`, `DELETE` methods และ `credentials: true`

**ข้อสังเกต:**
- Admin ยังใช้ JWT จาก `POST /api/auth/token` (Phase 1) สำหรับ admin endpoints
- Email forgot-password ใช้ได้ต่อเมื่อตั้ง `SMTP_USER` + `SMTP_PASS` ใน `.env`
- โลโก้ที่อัปโหลดจะอยู่ใน `SolarPanel/uploads/logos/` และ serve ผ่าน Python HTTP server ที่ port 8080 ได้เลย
- Rate limit สำหรับ login: 10 ครั้ง / 15 นาที / IP

---

## Phase 3 — Filter ตามจังหวัด / Rating

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
เพิ่ม filter bar ใน directory (index.html) ให้ลูกค้ากรองผู้ติดตั้งตามจังหวัดและ rating ได้แบบ real-time

### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| F-01 | ลูกค้า | กรองผู้ติดตั้งตามจังหวัด | เห็นเฉพาะที่บริการในพื้นที่ฉัน |
| F-02 | ลูกค้า | กรองตาม rating ขั้นต่ำ (4.5+, 4.8+, 5.0) | เลือกผู้ที่มีความน่าเชื่อถือสูง |
| F-03 | ลูกค้า | กรองตามประสบการณ์ (≥5 ปี, ≥8 ปี) | เลือกผู้มีประสบการณ์มากพอ |
| F-04 | ลูกค้า | Clear filter ทั้งหมดได้ในคลิกเดียว | รีเซ็ตกลับสู่สถานะเริ่มต้น |
| F-05 | ลูกค้า | เรียงลำดับ (rating สูง–ต่ำ, ประสบการณ์มาก–น้อย) | ค้นหาตามที่ต้องการได้รวดเร็ว |
| F-06 | ลูกค้า | เห็นจำนวนผลลัพธ์ที่ filter ได้ | รู้ว่ามีตัวเลือกเหลือกี่ราย |

### Filter Bar UI

```
[ ค้นหาชื่อ... ] [ จังหวัด ▼ ] [ Rating ▼ ] [ ประสบการณ์ ▼ ] [ เรียงโดย ▼ ] [× ล้าง]
                                                      แสดง X จาก 12 ราย
```

**Dropdown จังหวัด:** รวบรวมจาก `location` field ของ installerData แบบ dynamic (ไม่ hardcode)

**Dropdown Rating:**
- ทั้งหมด (default)
- 4.5 ขึ้นไป
- 4.8 ขึ้นไป
- 5.0 เท่านั้น

**Dropdown ประสบการณ์:**
- ทั้งหมด (default)
- 5 ปีขึ้นไป
- 8 ปีขึ้นไป
- 10 ปีขึ้นไป

**Dropdown เรียงโดย:**
- แนะนำ (default — เรียงตาม rating × reviews)
- Rating สูงสุด
- ประสบการณ์มากสุด
- ใหม่ล่าสุด

### Technical Requirements
- Filter logic อยู่ใน `script.js` — เพิ่ม `applyFilters()` ครอบ logic ปัจจุบัน
- State filter เก็บใน URL query param (`?province=กรุงเทพฯ&rating=4.8`) เพื่อ shareable link
- แสดงข้อความ "ไม่พบผู้ติดตั้งที่ตรงกับเงื่อนไข" เมื่อผลลัพธ์ว่าง
- Filter ต้องทำงานร่วมกับ search box ที่มีอยู่ (AND condition)
- Mobile: filter bar collapse เป็นปุ่ม "กรองผล" + bottom sheet บน viewport <768px

### Implementation Notes (✅ Done)

**API ที่ implement แล้ว:**
```
GET /api/installers          — รายชื่อผู้ติดตั้ง (query: province, minRating, minExp, sort, limit, offset)
GET /api/installers/:id      — รายละเอียดผู้ติดตั้งเดี่ยว (status='active' เท่านั้น)
```

**ไฟล์ที่สร้าง/แก้ไข:**
- `backend/node/server.js` — เพิ่ม `GET /api/installers` + `GET /api/installers/:id`
- `installers.js` — เปลี่ยนจาก `getAllInstallers()` (static) เป็น `fetch('/api/installers')`
- `installer-detail.html` — เปลี่ยนจาก `getInstallerById()` (static) เป็น `fetch('/api/installers/:id')`
- `installer-data.js` — **ลบออกแล้ว** (ถูกแทนที่ด้วย `/api/installers` ทั้งหมด)

**ข้อสังเกต:**
- Backend เสิร์ฟเฉพาะ installer ที่ `status='active'` เท่านั้น
- Sort แบบ "แนะนำ" ยังคง `rating × log(reviews + 1)` เหมือนเดิม

---

## Phase 4 — ระบบรีวิวจริงจากผู้ใช้

> Priority: **Medium** | Effort: **M** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
แทนที่ `reviews_sample` ที่เป็น mock data ด้วยระบบรีวิวจริงที่ลูกค้าสามารถเขียนและให้คะแนนได้

### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| R-01 | ลูกค้า | เขียนรีวิวและให้ดาว (1–5) ให้ผู้ติดตั้ง | แชร์ประสบการณ์จริงกับผู้อื่น |
| R-02 | ลูกค้า | ดูรีวิวทั้งหมดของผู้ติดตั้ง | ตัดสินใจเลือกได้ดีขึ้น |
| R-03 | ลูกค้า | กรองรีวิวตามดาว (5★, 4★, ฯลฯ) | โฟกัสรีวิวที่สนใจ |
| R-04 | ผู้ติดตั้ง | ตอบกลับรีวิวลูกค้าได้ | แสดงความใส่ใจ |
| R-05 | Admin | Approve รีวิวก่อนแสดงสาธารณะ | ป้องกัน spam / รีวิวเท็จ |
| R-06 | ลูกค้า | รีวิวได้โดยไม่ต้องสมัครสมาชิก (email verify เท่านั้น) | ลด friction |

### Review Form Fields

```
ชื่อผู้รีวิว (required)
อีเมล (required — ส่ง verification link ก่อนแสดง)
Rating: ★☆☆☆☆ ถึง ★★★★★ (required)
รายละเอียด (required, 20–1000 ตัวอักษร)
วันที่ติดตั้ง (optional — month/year เท่านั้น)
```

> **หมายเหตุ:** ไม่มีฟิลด์ "หัวข้อรีวิว" — backend auto-fill `title` จาก 50 ตัวอักษรแรกของ body เพื่อรักษา NOT NULL constraint ใน DB

### API Endpoints

```
GET  /api/reviews?installer_id=N&page=1&limit=10&stars=5
POST /api/reviews              — submit รีวิวใหม่ (รอ email verify)
GET  /api/reviews/:id/verify?token=XXX — verify email แล้ว activate รีวิว
POST /api/reviews/:id/reply    — ผู้ติดตั้งตอบกลับ (ต้อง auth)
PUT  /api/admin/reviews/:id    — Admin approve/reject
```

### Schema — ตาราง `reviews`

```sql
CREATE TABLE reviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  installer_id  INTEGER NOT NULL REFERENCES installers(id),
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  install_date  TEXT,                     -- "YYYY-MM" format
  reply         TEXT,                     -- ผู้ติดตั้งตอบกลับ
  reply_at      DATETIME,
  status        TEXT DEFAULT 'pending',   -- pending | active | rejected
  verify_token  TEXT,
  verified_at   DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Rating Aggregation
- `rating` และ `reviews_count` ใน installer record คำนวณจาก `reviews` table แบบ real-time ผ่าน `recalcInstallerRating()`
- `satisfaction_rate` คำนวณอัตโนมัติจาก reviews จริง: `round(จำนวน review rating ≥ 4 / จำนวนทั้งหมด × 100)`
- แสดง breakdown: กี่ % เป็น 5★, 4★, 3★, 2★, 1★ (histogram bar)
- Badge "ลูกค้าจริง ✓" แสดงเมื่อ `verified_at IS NOT NULL`

### เงื่อนไข auto-update `satisfaction_rate`
`recalcInstallerRating()` ถูกเรียกอัตโนมัติใน 3 กรณี:
1. ลูกค้า submit review + auto-verify (กรณีไม่มี SMTP)
2. ลูกค้า verify email สำเร็จ (กรณีมี SMTP)
3. Admin approve review

### UI — installer-detail.html
- ปุ่ม "เขียนรีวิว" เปิด modal form
- Pagination รีวิว (10 รายการ/หน้า)
- Sort: ล่าสุด / มีประโยชน์มากสุด / ดาวสูงสุด / ดาวต่ำสุด
- Filter ดาว: pill buttons (ทั้งหมด | 5★ | 4★ | 3★ | ≤2★)

### Implementation Notes (✅ Done)

**API ที่ implement แล้ว:**
```
GET  /api/reviews                  — ดูรีวิว (query: installer_id, page, limit, stars) + breakdown
POST /api/reviews                  — submit รีวิวใหม่ (rate limit: 5/hr/IP)
GET  /api/reviews/:id/verify       — verify email token → activate รีวิว
POST /api/reviews/:id/reply        — ผู้ติดตั้งตอบกลับ (ต้อง installerAuth)
PUT  /api/admin/reviews/:id        — Admin approve/reject (ต้อง adminAuth)
```

**ไฟล์ที่สร้าง/แก้ไข:**
- `backend/node/server.js` — เพิ่ม `reviews` table + routes ทั้งหมด, rating recalculation หลัง verify
- `installer-detail.html` — เพิ่ม modal form, star input, `fetchReviews()`, `submitReview()`, reply display

**ข้อสังเกต:**
- ถ้าไม่ตั้ง SMTP → รีวิวจะ auto-verify ทันที (ข้ามขั้นตอน email verification)
- `rating`, `reviews_count`, และ `satisfaction_rate` recalculate ทุกครั้งที่รีวิวถูก verify/approve
- `satisfaction_rate` = % ของรีวิว rating ≥ 4 จากทั้งหมด (ไม่ใช่ค่า static อีกต่อไป)
- `reviews_sample` ใน installer object เป็น legacy data (ถูก override โดย API จริง)

---

## Phase 4.5 — Auto-Project จาก Lead (Close Lead → บันทึกโครงการอัตโนมัติ)

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
เมื่อผู้ติดตั้งเปลี่ยนสถานะ Lead เป็น "ปิดงาน" (closed) ระบบจะบันทึกเป็นโครงการในหน้า installer-detail.html อัตโนมัติ แทนที่การกรอก mock data ด้วยมือ

### Flow
```
Dashboard → Lead Table → เปลี่ยนสถานะเป็น "ปิดงาน"
    ↓
Modal ถามขนาดระบบ (kW) — optional
    ↓ ยืนยัน
PUT /api/leads/:id/status { status: "closed", system_kw: 5 }
    ↓ backend
เพิ่ม entry ใน projects[] ของ installer
เพิ่ม total_projects + 1
เพิ่ม total_kw + system_kw (ถ้าระบุ)
    ↓
หน้า installer-detail.html แสดงโครงการใหม่ทันที
```

### การคำนวณ savings
```
annual_savings = round(system_kw × 5,800 / 500) × 500  บาท/ปี
(peak sun hours 4.5 × efficiency 0.8 × 30 วัน × 12 เดือน × 4.50 บาท/หน่วย)
```

ถ้าไม่ระบุ kW → savings แสดง "ไม่ระบุขนาดระบบ" และ total_kw บวก 0

### Schema เพิ่มเติม

```sql
-- leads table: เพิ่ม column
ALTER TABLE leads ADD COLUMN system_kw REAL;
```

### ไฟล์ที่แก้ไข
- `backend/node/server.js` — `PUT /api/leads/:id/status`: รับ `system_kw`, auto-add project + increment `total_projects` + increment `total_kw`
- `dashboard.html` — เพิ่ม modal ถาม kW ก่อน close, ส่ง `system_kw` ไปกับ request

### ข้อสังเกต
- บันทึกโครงการเฉพาะครั้งแรกที่เปลี่ยนเป็น `closed` (ไม่ duplicate ถ้า reopen แล้ว close ซ้ำ)
- Lead ที่ไม่ระบุ `installer_id` ไม่สามารถปิดงานผ่าน installer dashboard ได้ (ต้อง admin)
- `total_projects` และ `total_kw` ใน installer card (installers.html) จะอัปเดตอัตโนมัติหลัง reload

---

## Phase 4.6 — Portfolio Gallery ผู้ติดตั้ง

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ผู้ติดตั้งอัปโหลดรูปผลงานจริงจาก Dashboard และแสดงเป็น Gallery บนหน้า installer-detail.html เพื่อเพิ่มความน่าเชื่อถือ

### Flow
```
Dashboard → Tab "🖼️ ผลงาน" → ลากวางหรือเลือกรูป + คำบรรยาย → อัปโหลด
    ↓
รูปบันทึกลง uploads/portfolio/ + ตาราง portfolio_photos
    ↓
หน้า installer-detail.html → section "🖼️ ผลงานของเรา" (ซ่อนถ้าไม่มีรูป)
    ↓
คลิกรูป → Lightbox เปิดดูรูปใหญ่ + เลื่อนซ้าย/ขวา + กด ESC ปิด
```

### API Endpoints

```
GET    /api/portfolio?installer_id=N    — ดูรูปผลงาน (สาธารณะ)
POST   /api/installer/portfolio         — อัปโหลดรูป (ต้อง login, multipart/form-data)
DELETE /api/installer/portfolio/:id     — ลบรูป (ต้อง login — เฉพาะรูปของตัวเอง)
```

### Schema — ตาราง `portfolio_photos`

```sql
CREATE TABLE IF NOT EXISTS portfolio_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  installer_id INTEGER NOT NULL REFERENCES installers(id),
  photo_url    TEXT    NOT NULL,
  caption      TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Upload Config
- **Path:** `uploads/portfolio/` (สร้างอัตโนมัติเมื่อ server start)
- **Filename:** `portfolio-{installer_id}-{timestamp}.{ext}`
- **Max size:** 5 MB ต่อรูป
- **Max count:** 20 รูปต่อผู้ติดตั้ง
- **Format:** image/* เท่านั้น (JPG, PNG, WebP ฯลฯ)

### Request — POST /api/installer/portfolio

```
Content-Type: multipart/form-data
Authorization: Bearer <token>

photo    (file, required)
caption  (text, optional, max 200 ตัวอักษร)
```

### Response

```json
// 200 OK
{
  "success": true,
  "photo": {
    "id": 1,
    "photo_url": "/uploads/portfolio/portfolio-1-1234567890.jpg",
    "caption": "ติดตั้ง 10 kW บ้านพักอาศัย กรุงเทพฯ",
    "created_at": "2026-05-08T..."
  }
}

// 400 — เกิน 20 รูป
{ "success": false, "message": "อัปโหลดได้สูงสุด 20 รูป" }
```

### Dashboard UI — Tab "🖼️ ผลงาน"
- **Upload Zone:** drag & drop area + ปุ่ม "เลือกรูปภาพ"
- **Caption Input:** text field ใต้ upload zone (ไม่บังคับ)
- **Portfolio Grid:** 5 คอลัมน์ (≤900px → 4, ≤680px → 3, ≤480px → 2) — แสดงรูปทั้งหมด พร้อมปุ่ม "✕ ลบ" แต่ละรูป
- โหลดรูปใหม่ทุกครั้งที่เปิด tab "ผลงาน"

### Installer Detail UI — Section "🖼️ ผลงานของเรา"
- **ซ่อน section** โดย default ถ้าผู้ติดตั้งไม่มีรูป (`display:none`)
- **Grid:** 3 คอลัมน์บน desktop, 2 คอลัมน์บน mobile (≤768px)
- **Hover effect:** ขยายรูปเล็กน้อย + แสดง caption overlay
- **Lightbox:** คลิกรูปเปิดดูใหญ่ได้
  - ปุ่ม `‹` / `›` เลื่อนระหว่างรูป (ซ่อนถ้ามีรูปเดียว)
  - กด `ESC` หรือคลิกพื้นหลังเพื่อปิด
  - กด `←` `→` เพื่อเลื่อนรูป
  - แสดง caption ด้านล่าง

### ไฟล์ที่สร้าง/แก้ไข
- `backend/node/server.js` — เพิ่มตาราง `portfolio_photos`, multer `portfolioUpload`, 3 routes
- `dashboard.html` — เพิ่ม tab "🖼️ ผลงาน" + upload zone + grid + JS จัดการ
- `installer-detail.html` — เพิ่ม section gallery + lightbox HTML/CSS/JS
- `styles.css` — เพิ่ม `.dash-portfolio-*` styles

---

## Phase 4.7 — Profile Views Counter + Dashboard Stat Grid 5 คอลัมน์

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
แสดงจำนวนผู้ที่เข้าชมหน้าโปรไฟล์ของผู้ติดตั้งใน Dashboard overview และปรับ stat grid ให้รองรับ 5 การ์ดต่อแถว

### การ์ด Overview (5 การ์ด)

| การ์ด | Icon | ID | สีขอบ |
|-------|------|-----|-------|
| Lead ใหม่ | 🔔 | `stat-new` | `#60a5fa` (ฟ้า) |
| Lead ทั้งหมด | 📋 | `stat-total` | `#00b8a0` (teal) |
| ติดต่อแล้ว | 📞 | `stat-contacted` | `#fbbf24` (เหลือง) |
| ปิดงานแล้ว | ✅ | `stat-closed` | `#34d399` (เขียว) |
| ดูโปรไฟล์ทั้งหมด | 👁️ | `stat-views` | `#a78bfa` (ม่วง) |

### ตรรกะการนับ Profile Views
- นับทุกครั้งที่มีคนเรียก `GET /api/installers/:id` (เปิดหน้า installer-detail.html)
- บันทึกใน column `profile_views INTEGER DEFAULT 0` ใน `installers` table
- แสดงใน Dashboard ผ่าน `GET /api/installer/me` → field `profile_views`
- ค่าสะสมตลอดอายุ ไม่ reset

### Responsive Grid
- Desktop (>900px): `repeat(5, 1fr)` — 5 การ์ดใน 1 แถว
- Tablet (≤900px): `repeat(3, 1fr)` — 3 การ์ดต่อแถว
- Mobile (≤600px): `repeat(2, 1fr)` — 2 การ์ดต่อแถว

### ไฟล์ที่แก้ไข
- `backend/node/server.js` — `addCol('installers', 'profile_views', 'INTEGER DEFAULT 0')`, increment ใน `GET /api/installers/:id`, return ใน `GET /api/installer/me`
- `dashboard.html` — เพิ่มการ์ด `stat-views`, populate จาก `loadProfile()`
- `styles.css` — `grid-template-columns: repeat(5, 1fr)`, เพิ่ม `.dash-stat--views`, ปรับ responsive breakpoints

---

## Phase 5 — แผนที่ / Blog / SEO / Analytics

---

### 5A — แผนที่พื้นที่บริการ

> Priority: **Low–Medium** | Effort: **S** | สถานะ: **✅ Implemented**

**วัตถุประสงค์:** แสดงแผนที่บน installer-detail.html ว่าผู้ติดตั้งบริการจังหวัดใดบ้าง

**Library:** Leaflet.js 1.9.4 (CDN + SRI integrity hash) + OpenStreetMap tiles

**User Stories**

| ID | I want to… | สถานะ |
|----|-----------|-------|
| M-01 | เห็นแผนที่แสดงพื้นที่บริการของผู้ติดตั้ง | ✅ |
| M-02 | ดู pin location ของสำนักงาน/โชว์รูมผู้ติดตั้ง | ✅ |
| M-03 | ในหน้า directory เห็น map view สลับกับ card view ได้ | Pending (5A-v2) |

### Schema เพิ่มเติม

```sql
-- เพิ่ม columns ใน installers table
ALTER TABLE installers ADD COLUMN lat REAL;
ALTER TABLE installers ADD COLUMN lng REAL;
ALTER TABLE installers ADD COLUMN service_provinces TEXT;  -- JSON array: ["กรุงเทพฯ","นนทบุรี"]
```

### Coordinates — 12 Seed Installers

| ID | ชื่อ | lat | lng | พื้นที่บริการ |
|----|------|-----|-----|-------------|
| 2 | Eco Solar Pro | 13.7534 | 100.5014 | กรุงเทพฯ, นนทบุรี, ปทุมธานี, สมุทรปราการ |
| 3 | Green Energy Tech | 18.7904 | 98.9847 | เชียงใหม่, ลำพูน, เชียงราย |
| 4 | Solar Master | 7.1892 | 100.5952 | สงขลา, ปัตตานี, นครศรีธรรมราช, สุราษฎร์ธานี |
| 5 | Bright Solar Solutions | 13.8591 | 100.5126 | กรุงเทพฯ, นนทบุรี, ปทุมธานี |
| 6 | Sun Power Installation | 14.0208 | 100.5250 | ปทุมธานี, สมุทรปราการ, สมุทรสาคร |
| 7 | Clean Energy Pro | 16.4419 | 102.8360 | ขอนแก่น, อุดรธานี, หนองคาย |
| 8 | Solar Vision Thailand | 13.3611 | 100.9817 | ชลบุรี, ระยอง, จันทบุรี |
| 9 | Future Energy Systems | 14.9799 | 102.0978 | นครราชสีมา, บุรีรัมย์, สุรินทร์ |
| 10 | Golden Sun Installation | 19.9071 | 99.8305 | เชียงราย, เชียงใหม่, พะเยา |
| 11 | Tech Solar Thailand | 16.8211 | 100.2659 | พิษณุโลก, เพชรบูรณ์, สุโขทัย |
| 12 | Premier Solar Group | 7.0062 | 100.4694 | สงขลา, ยะลา, นราธิวาส |
| 13 | Power Light Solutions | 9.1382 | 99.3217 | สุราษฎร์ธานี, ชุมพร, ระนอง |

### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `addCol` 3 columns, `seedMapData()` อัปเดต lat/lng ถ้า `lat IS NULL`, อัปเดต `parseInstallerJson()` ให้ parse `service_provinces`, อัปเดต SELECT ใน `GET /api/installers/:id`
- `installer-detail.html` — เพิ่ม Leaflet CDN ใน `<head>`, section "📍 พื้นที่บริการ" (ระหว่าง Projects กับ Portfolio), `initMap(d)` function

**UI บน installer-detail.html:**
- **Province tags** — chip สีเขียว แสดงรายชื่อจังหวัดที่บริการ
- **Leaflet map** — zoom level 9, OpenStreetMap tiles
  - ☀️ marker emoji ที่ตั้งสำนักงาน + popup ชื่อบริษัท
  - วงกลม dashed สีเขียว แสดงรัศมีพื้นที่บริการ (70–160 km ตามจำนวนจังหวัด)
  - `scrollWheelZoom: false` ป้องกัน scroll ติด
- **ซ่อนอัตโนมัติ** ถ้า installer ไม่มี lat/lng

**ข้อสังเกต:**
- `seedMapData()` ใช้ `WHERE lat IS NULL` — ปลอดภัยถ้า reseed ซ้ำ
- Installer ที่สมัครใหม่สามารถตั้ง lat/lng ได้ผ่าน Location Autocomplete widget ใน Dashboard (Phase 5A.1 ✅)
- Map สำหรับ directory view (M-03) ยังเป็น Pending — ต้องทำ toggle Card/Map บน installers.html

---

### 5A.1 — Location Autocomplete Widget (Dashboard Profile)

> สถานะ: **✅ Implemented**

**วัตถุประสงค์:** แทนที่ช่อง "จังหวัดที่ให้บริการ" แบบ plain text ด้วย autocomplete widget ที่ค้นหาพื้นที่จาก OpenStreetMap Nominatim API และบันทึก lat/lng อัตโนมัติ ทำให้แผนที่ใน installer-detail.html แสดงได้ทันทีหลัง save

**User Stories**

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| LA-01 | ผู้ติดตั้ง | พิมพ์ชื่อพื้นที่แล้วเห็น dropdown แนะนำ | ไม่ต้องกรอกชื่อจังหวัดเองแบบ free-text |
| LA-02 | ผู้ติดตั้ง | เลือกพื้นที่ได้หลายแห่ง (tags) | ระบุพื้นที่บริการได้ครบถ้วน |
| LA-03 | ผู้ติดตั้ง | ลบ tag พื้นที่ได้ด้วยปุ่ม × | แก้ไขได้ง่าย |
| LA-04 | ระบบ | บันทึก lat/lng ของตำแหน่งแรกที่เลือก | แผนที่ใน installer-detail.html แสดง pin ได้ทันที |
| LA-05 | ระบบ | บันทึก service_provinces[] จาก tags ทั้งหมด | แผนที่วาด boundary ได้ครบทุกจังหวัด |

**API ที่ใช้:** Nominatim OpenStreetMap (ฟรี, ไม่ต้องใช้ API key)

```
GET https://nominatim.openstreetmap.org/search
  ?q=<ข้อความค้นหา>
  &countrycodes=th
  &format=json
  &limit=7
  &accept-language=th
  &addressdetails=1
```

**Widget Behavior**
- Debounce 400ms ก่อนเรียก API (ป้องกัน request ถี่เกินไป)
- แสดง dropdown: ชื่อสั้น + ที่อยู่ย่อ + ป้าย type (จังหวัด / อำเภอ/เขต / แขวง/ตำบล / เมือง ฯลฯ)
- คลิกเลือก → เพิ่มเป็น tag chip สีเขียว (ไม่ duplicate)
- กด × บน tag → ลบออก
- ตำแหน่งแรกที่เลือก = primary lat/lng สำหรับ map pin
- ปิด dropdown เมื่อคลิกนอก widget

**ข้อมูลที่บันทึกลง DB เมื่อ Save Profile**

| Field | ค่า | หมายเหตุ |
|-------|-----|---------|
| `location` | tag names joined ด้วย `, ` | ใช้ใน filter และ card display |
| `lat` | lat ของ tag แรก | ใช้เป็น map pin |
| `lng` | lng ของ tag แรก | ใช้เป็น map pin |
| `service_provinces` | `["ชื่อ1","ชื่อ2",…]` JSON | ใช้วาด boundary บนแผนที่ |

**ไฟล์ที่แก้ไข:**
- `dashboard.html` — แทนที่ `<input id="p-location">` ด้วย `.loc-widget` + `.loc-dropdown` + JS (state `locationTags[]`, `renderLocationTags()`, `addLocationTag()`, Nominatim fetch, event delegation)
- `backend/node/server.js` — `GET /api/installer/me` เพิ่ม `lat`, `lng`, `service_provinces` ใน SELECT + parse JSON; `PUT /api/installer/me` รับและ save ค่าทั้งสาม
- `styles.css` — เพิ่ม `.loc-widget`, `.loc-tag`, `.loc-tag-remove`, `.loc-dropdown`, `.loc-item`, `.loc-item-type`, `.loc-status`, `.loc-hint`

**ข้อสังเกต:**
- Nominatim มี usage policy: max 1 req/วินาที ต่อ IP — debounce 400ms เพียงพอสำหรับ single user
- ถ้าผู้ติดตั้งลบ tag ทั้งหมด → lat/lng = null → map section ใน installer-detail.html ซ่อนอัตโนมัติ (ตาม Phase 5A logic เดิม)
- Seed installers 12 ราย ยังคง lat/lng เดิมจาก `seedMapData()` ไม่ถูกเปลี่ยน

---

### 5B — Blog / บทความ

> Priority: **Low–Medium** | Effort: **M** | สถานะ: Pending

**วัตถุประสงค์:** เพิ่ม content เพื่อ SEO และสร้าง trust ให้ผู้เยี่ยมชม

**หน้าใหม่**

| URL | คำอธิบาย |
|-----|---------|
| `/blog/` | หน้า index บทความทั้งหมด |
| `/blog/[slug].html` | หน้าบทความเดี่ยว |

**User Stories**

| ID | I want to… |
|----|-----------|
| BL-01 | อ่านบทความเกี่ยวกับโซลาร์เซลล์ เช่น "วิธีเลือกขนาดโซลาร์" |
| BL-02 | แชร์บทความผ่าน Facebook / LINE |
| BL-03 | เห็น related articles ที่ปลายบทความ |

**Blog Post Schema (Static JSON)**
```json
{
  "slug": "how-to-choose-solar-size",
  "title": "วิธีเลือกขนาดโซลาร์เซลล์ที่เหมาะกับบ้าน",
  "excerpt": "string (160 ตัวอักษร สำหรับ meta)",
  "cover_image": "string",
  "author": "string",
  "published_at": "YYYY-MM-DD",
  "tags": ["string"],
  "content_html": "string"
}
```

**Phase 1 (Static):** บทความเป็น HTML ไฟล์ ไม่ต้องมี CMS  
**Phase 2 (Dynamic):** ใช้ headless CMS (Notion API / Contentful) หรือ Markdown files

---

### 5C — SEO

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

**วัตถุประสงค์:** ให้ Google index และ rank หน้าสำคัญได้ดี

**สิ่งที่ต้องทำทุกหน้า**

```html
<!-- Meta tags -->
<title>ชื่อหน้า | Solar Panel Thailand</title>
<meta name="description" content="[160 chars max]">
<meta name="robots" content="index, follow">

<!-- Open Graph (Facebook / LINE preview) -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="[absolute URL]">
<meta property="og:url" content="[canonical URL]">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
```

**Structured Data (JSON-LD) ต่อหน้า**

| หน้า | Schema Type |
|------|------------|
| index.html | `WebSite` + `SearchAction` |
| installer-detail.html | `LocalBusiness` + `AggregateRating` + `Review` |
| blog/[slug].html | `Article` + `BreadcrumbList` |
| calculator.html | `WebPage` |

**ตัวอย่าง LocalBusiness Schema (installer-detail)**
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Eco Solar Pro",
  "telephone": "02-XXX-XXXX",
  "email": "info@example.com",
  "areaServed": ["กรุงเทพมหานคร", "นนทบุรี"],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "127"
  }
}
```

**อื่นๆ**
- `sitemap.xml` — list ทุก URL รวม installer detail (id=1–12) และ blog posts
- `robots.txt` — อนุญาต Googlebot, block `/dashboard/`, `/admin/`
- Canonical URL ทุกหน้า (ป้องกัน duplicate content)
- Lazy loading รูปภาพ (`loading="lazy"`)
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms

---

### 5C.1 — AI Search Optimization (AIO)

> Priority: **Medium** | Effort: **S** | สถานะ: Pending

**วัตถุประสงค์:** ให้เว็บปรากฏใน AI search tools เช่น ChatGPT, Perplexity, Google AI Overviews, Claude ได้ดียิ่งขึ้น และให้ AI เข้าใจข้อมูลผู้ติดตั้งได้อย่างถูกต้อง

---

#### 1. FAQPage JSON-LD (installer-detail.html)

FAQ 4 ข้อที่มีอยู่แล้วใน accordion → เพิ่ม schema ให้ Google AI Overviews ดึงไปแสดงได้โดยตรง

**วิธีทำ:** inject ใน `injectSeoMeta(d)` พร้อมกับ LocalBusiness schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "ใช้เวลาติดตั้งนานแค่ไหน?",
      "acceptedAnswer": { "@type": "Answer", "text": "โดยทั่วไปใช้เวลา 1–3 วันทำการ..." }
    },
    {
      "@type": "Question",
      "name": "ต้องเตรียมอะไรบ้างก่อนติดตั้ง?",
      "acceptedAnswer": { "@type": "Answer", "text": "หลังคาต้องแข็งแรง ทางบริษัทจะสำรวจฟรีก่อนติดตั้ง" }
    },
    {
      "@type": "Question",
      "name": "หลังติดตั้งแล้วดูแลยากไหม?",
      "acceptedAnswer": { "@type": "Answer", "text": "ทำความสะอาดแผงปีละ 1–2 ครั้งก็เพียงพอ" }
    },
    {
      "@type": "Question",
      "name": "ค่าไฟจะลดได้มากแค่ไหน?",
      "acceptedAnswer": { "@type": "Answer", "text": "เฉลี่ย 60–80% บางรายได้มากกว่า 90% ขึ้นอยู่กับขนาดระบบและพฤติกรรมการใช้ไฟ" }
    }
  ]
}
```

---

#### 2. llms.txt

ไฟล์ที่ root `/llms.txt` — emerging standard (fast.ai, 2024) ให้ LLMs อ่านสรุปข้อมูลเว็บในรูปแบบ plain text/Markdown แทนที่จะต้อง crawl ทุกหน้า

**ไฟล์ที่สร้าง:** `llms.txt` ที่ root

**รูปแบบ:**
```markdown
# Solar Panel Thailand

> แพลตฟอร์มค้นหาและเปรียบเทียบผู้ติดตั้งโซลาร์เซลล์ในประเทศไทย

## เกี่ยวกับเรา
รวบรวมผู้ติดตั้งโซลาร์เซลล์ที่ผ่านการตรวจสอบกว่า 12 ราย ครอบคลุมทั่วประเทศ
พร้อมเครื่องคำนวณค่าติดตั้งและรีวิวจากลูกค้าจริง

## หน้าสำคัญ
- [หน้าแรก](https://solarpanelth.com/)
- [รายชื่อผู้ติดตั้ง](https://solarpanelth.com/installers.html)
- [คำนวณราคาโซลาร์](https://solarpanelth.com/calculator.html)

## ข้อมูลผู้ติดตั้ง
...รายชื่อผู้ติดตั้งทั้ง 12 ราย พร้อมพื้นที่บริการ...

## คำถามที่พบบ่อย
...
```

---

#### 3. robots.txt — ระบุ AI crawlers ชัดเจน

เพิ่ม explicit allow สำหรับ AI bots หลัก และ block dashboard/login เหมือนเดิม

```
User-agent: GPTBot
Allow: /
Disallow: /dashboard.html
Disallow: /login.html
Disallow: /register.html

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /
```

---

#### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| AI-01 | เจ้าของเว็บ | ให้ Google AI Overviews ดึง FAQ ขึ้นมาแสดง | ผู้ใช้เห็นคำตอบทันทีใน Google |
| AI-02 | เจ้าของเว็บ | ให้ ChatGPT/Perplexity อ้างอิงข้อมูลผู้ติดตั้งได้ถูกต้อง | สร้าง brand awareness ผ่าน AI |
| AI-03 | เจ้าของเว็บ | ให้ AI crawlers เข้าถึงข้อมูลสำคัญได้สะดวก | เว็บถูก index ใน AI knowledge base |

#### ไฟล์ที่ต้องสร้าง/แก้ไข
- `installer-detail.html` — เพิ่ม FAQPage JSON-LD ใน `injectSeoMeta(d)`
- `llms.txt` — สร้างใหม่ที่ root
- `robots.txt` — เพิ่ม explicit AI bot rules

---

### 5D — Analytics

> Priority: **Low–Medium** | Effort: **S** | สถานะ: **✅ Implemented**

**วัตถุประสงค์:** ติดตามพฤติกรรมผู้ใช้เพื่อปรับปรุงเว็บ

**Tools ที่เลือก**

| Tool | วัตถุประสงค์ | ค่าใช้จ่าย |
|------|------------|---------|
| Google Analytics 4 (GA4) | Page views, user journey, demographics | ฟรี |
| Google Search Console | Keyword, click, impression จาก Google | ฟรี |
| Microsoft Clarity | Session recording, heatmap | ฟรี |

**Events ที่ต้อง Track**

```js
// Calculator interactions
gtag('event', 'calculator_complete', {
  system_size: kw,
  system_type: type,
  estimated_cost: totalInstall
});

// Directory interactions
gtag('event', 'installer_view', { installer_id: id, installer_name: name });
gtag('event', 'contact_click', { installer_id: id, method: 'phone|line|form' });

// Lead submission
gtag('event', 'lead_submit', { province: province, has_installer: !!installerId });

// Blog
gtag('event', 'blog_read', { slug: slug, read_percent: 75 });
```

**Dashboard KPIs (ดูใน GA4)**
- Unique visitors / สัปดาห์
- หน้าที่เข้าชมมากสุด
- Conversion rate: ดู directory → คลิกติดต่อ
- Calculator completion rate (กี่ % ที่กรอกครบ 6 ขั้น)
- Lead submissions / วัน

**Privacy**
- เพิ่ม Cookie Consent banner (PDPA compliance)
- ไม่เก็บ PII ใน GA4 events
- `anonymize_ip: true` ใน gtag config

#### ไฟล์ที่สร้าง/แก้ไข
- `analytics.js` — สร้างใหม่ที่ root: GA4 + Clarity loader (consent-gated), PDPA cookie banner, `window.trackEvent()` helper
- `index.html` — เพิ่ม `<script src="analytics.js">` + event `lead_submit`
- `installers.html`, `calculator.html`, `login.html`, `register.html` — เพิ่ม `<script src="analytics.js">`
- `installer-detail.html` — เพิ่ม `<script src="analytics.js">` + events `installer_view`, `contact_click` (phone/line/form)
- `calculator-widget.js` — เพิ่ม event `calculator_complete` เมื่อเลือก battery (ขั้นตอนสุดท้าย)

---

### 5D.1 — Analytics Settings UI (Admin)

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

**วัตถุประสงค์:** ให้ Admin ตั้งค่า GA4 Measurement ID และ Clarity Project ID ผ่าน Admin Panel โดยไม่ต้องแก้ code

#### การทำงาน
- เก็บ `ga4_id` และ `clarity_id` ใน `site_content` table (เช่นเดียวกับ SMTP settings)
- `analytics.js` fetch IDs จาก `GET /api/analytics-config` ทุกครั้งที่หน้าโหลด — ไม่ต้อง restart server เมื่อเปลี่ยน ID
- ถ้า ID ว่าง → ไม่โหลด library (ไม่มี error)

#### API Endpoints ใหม่
- `GET /api/analytics-config` — สาธารณะ, return เฉพาะ `ga4_id` + `clarity_id`

#### ไฟล์ที่สร้าง/แก้ไข
- `backend/node/server.js` — เพิ่ม seed `ga4_id: ''` + `clarity_id: ''`, เพิ่ม `GET /api/analytics-config`
- `analytics.js` — เปลี่ยนจาก hardcoded IDs → fetch จาก API
- `admin.html` — เพิ่มแท็บ ตั้งค่า → card "📊 ตั้งค่า Analytics" (GA4 ID + Clarity ID + ปุ่มบันทึก), rename nav "ตั้งค่า SMTP" → "ตั้งค่า"

---

## Phase 6 — Admin Panel

> Priority: **High** | Effort: **L** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ Admin มีหน้าเว็บสำหรับจัดการระบบทั้งหมดโดยไม่ต้องใช้ curl/Postman — ครอบคลุมการอนุมัติผู้ติดตั้ง, จัดการรีวิว, ดู Lead ทั้งระบบ และแก้ไข Content หน้าแรก

### หน้าใหม่ที่ต้องสร้าง

| หน้า | URL | คำอธิบาย |
|------|-----|---------|
| Admin Panel | `/admin.html` | หน้าหลัก Admin — แท็บทั้งหมดในที่เดียว |

> **หมายเหตุ:** `admin.html` redirect ไป `login.html` อัตโนมัติถ้าไม่มี token หรือ role ไม่ใช่ `admin`

### User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|---------|
| AD-01 | Admin | Login ด้วย email + password | เข้าระบบได้อย่างปลอดภัยโดยไม่ต้องใช้ secret ดิบ |
| AD-02 | Admin | เห็น overview stats ภาพรวมระบบ | รู้สถานะโดยรวมได้ทันที |
| AD-03 | Admin | ดูรายชื่อผู้ติดตั้งที่รอ approve | จัดการ pending installer ได้ทันที |
| AD-04 | Admin | Approve / Reject / Suspend ผู้ติดตั้ง | ควบคุมคุณภาพ directory |
| AD-05 | Admin | แก้ไขข้อมูลผู้ติดตั้งแทนได้ | แก้ข้อมูลผิดโดยไม่ต้องรอ installer |
| AD-06 | Admin | ดูรีวิวที่รอ approve | กลั่นกรองรีวิวก่อนเผยแพร่ |
| AD-07 | Admin | Approve / Reject รีวิว | ป้องกัน spam / รีวิวเท็จ |
| AD-08 | Admin | ดู Lead ทั้งหมดจากทุก installer | ติดตาม pipeline ภาพรวม |
| AD-09 | Admin | แก้ไข Content หน้าแรก (Hero, Stats, FAQ) | อัปเดตข้อมูลโดยไม่ต้องแก้ HTML ตรง |
| AD-10 | Admin | Logout ออกจากระบบ | ความปลอดภัยเมื่อใช้เสร็จ |

---

### Phase 6A — Admin Authentication

**วัตถุประสงค์:** เปลี่ยนจากการสร้าง JWT ผ่าน secret ดิบ (`POST /api/auth/token`) ไปเป็น Login ด้วย email + password ที่มี `role = 'admin'` ใน DB

#### การสร้าง Admin Account
Admin account สร้างผ่าน script หรือ endpoint พิเศษ (ไม่ผ่านหน้า register ปกติ)

```bash
# วิธีสร้าง Admin ครั้งแรก (one-time setup via API)
curl -X POST http://localhost:3000/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "<JWT_SECRET>", "email": "admin@example.com", "password": "strongpassword"}'
```

> endpoint นี้ทำงานได้เพียงครั้งเดียว (ถ้า admin มีอยู่แล้วจะ return error)

#### Auth Flow

```
Admin กรอก email + password ใน login.html
    ↓
POST /api/auth/login  (เดิม)
    ↓ backend ตรวจ role
    ↓ role === 'admin'
redirect → admin.html
    ↓ role === 'installer'
redirect → dashboard.html
```

#### API Endpoints ใหม่

```
POST /api/admin/seed    — สร้าง admin account ครั้งแรก (ต้องส่ง JWT_SECRET)
```

> `POST /api/auth/login` เดิมไม่ต้องเปลี่ยน — แค่เพิ่ม redirect logic ใน frontend

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `POST /api/admin/seed` (one-time, ตรวจสอบว่า admin มีอยู่แล้วก่อน insert)
- `login.html` — เพิ่ม redirect logic: `data.user.role === 'admin'` → `admin.html`, อื่นๆ → `dashboard.html`

**ข้อสังเกต:**
- email ในระบบ admin ไม่จำเป็นต้องเป็น email format — ใช้ username ได้ (เช่น `admin`)
- endpoint `/api/admin/seed` return error ถ้ามี admin อยู่แล้ว (ป้องกัน duplicate)

---

### Phase 6B — Installer Management UI

**วัตถุประสงค์:** ให้ Admin ดูและจัดการผู้ติดตั้งได้จากหน้าเว็บแทน curl

#### UI Layout — Tab "👥 ผู้ติดตั้ง"

```
[ Filter: ทั้งหมด | รอ Approve | Active | Suspended ]   [ 🔍 ค้นหาชื่อ/อีเมล ]

┌─────────────────────────────────────────────────────────────────────┐
│ ชื่อ / อีเมล         │ พื้นที่    │ สมัครเมื่อ │ สถานะ    │ Actions │
├─────────────────────────────────────────────────────────────────────┤
│ บริษัท A / a@a.com  │ กรุงเทพฯ  │ 9 พ.ค. 69  │ 🟡 รอ   │ ✅ ❌ 🔍 │
│ บริษัท B / b@b.com  │ เชียงใหม่  │ 8 พ.ค. 69  │ 🟢 Active│ ⛔ 🔍   │
└─────────────────────────────────────────────────────────────────────┘
```

**Actions ต่อแถว:**
- ✅ Approve (แสดงเมื่อ status = pending)
- ❌ Reject (แสดงเมื่อ status = pending)
- ⛔ Suspend (แสดงเมื่อ status = active)
- 🔄 Reactivate (แสดงเมื่อ status = suspended)
- 🔍 ดูโปรไฟล์ (เปิด installer-detail.html ใน tab ใหม่)

**Modal แก้ไขข้อมูล (Admin Override):**
- คลิกชื่อ installer → เปิด modal form แก้ไข field ทั้งหมด
- ปุ่ม "บันทึก" → `PUT /api/admin/installers/:id` (ต้องเพิ่ม endpoint ใหม่)

#### API Endpoints ใหม่

```
PUT /api/admin/installers/:id    — แก้ไขข้อมูล installer (Admin override)
```

> `GET /api/admin/installers` และ `PUT /api/admin/installers/:id/approve` มีอยู่แล้ว

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `PUT /api/admin/installers/:id`, เพิ่ม `reactivate` action ใน approve endpoint
- `admin.html` — Tab "👥 ผู้ติดตั้ง": filter (status/ค้นหา), ตาราง, actions (Approve/Reject/Suspend/Reactivate/Edit/View), modal แก้ไขข้อมูล

---

### Phase 6B.1 — Registration Mode Setting ✅

**วัตถุประสงค์:** ให้ Admin เลือกโหมดการรับสมัครผู้ติดตั้งได้ระหว่าง 2 แบบ โดยไม่ต้องแก้โค้ด

#### โหมดที่รองรับ

| โหมด | ค่า (`registration_mode`) | พฤติกรรม |
|------|--------------------------|---------|
| Approve by Admin | `manual` (default) | ผู้สมัครใหม่ได้ `status = pending` — ต้องรอ Admin อนุมัติ |
| Auto Approve | `auto` | ผู้สมัครใหม่ได้ `status = active` + `verified_at` ทันที — เข้าสู่ระบบได้เลย |

#### Setting Storage
- เก็บใน `site_content` table (key: `registration_mode`, value: `manual` | `auto`)
- default: `manual` (seeded ตอน server start)

#### UI — ด้านบนแท็บ "👥 ผู้ติดตั้ง" ใน admin.html

```
⚙️ ตั้งค่าการสมัคร
[ 🔍 Approve by Admin ]  [ ⚡ Auto Approve ]   ← toggle กลุ่ม (highlight สีเขียวเมื่อ active)
โหมดที่เลือกจะบันทึกอัตโนมัติทันทีเมื่อคลิก
```

#### API
- อ่าน: `GET /api/admin/content` (ดึง `registration_mode` จาก content map)
- บันทึก: `PUT /api/admin/content/registration_mode` — ใช้ endpoint Content ที่มีอยู่แล้ว

#### ไฟล์ที่แก้ไข
- `backend/node/server.js` — เพิ่ม `registration_mode: 'manual'` ใน `seedContent()` defaults; แก้ `POST /api/auth/register` ให้อ่าน mode จาก DB และ set `status` + `verified_at` ตามโหมด
- `admin.html` — เพิ่ม Settings card ด้านบนตารางผู้ติดตั้ง, CSS `.reg-mode-group / .reg-mode-opt`, JS `loadRegMode()` / `saveRegMode()` / `setRegModeUI()`

#### ข้อสังเกต
- ถ้าเปลี่ยนโหมดกลางคัน ผู้ที่สมัครก่อนหน้าไม่ได้รับผลกระทบ (เฉพาะสมัครใหม่หลังจากเปลี่ยน)
- Auto mode ไม่ส่ง email แจ้ง Admin (เพราะไม่ต้องรอ review)
- Manual mode ยังส่ง email แจ้ง Admin เหมือนเดิม (ถ้าตั้ง SMTP)

---

### Phase 6C — Review Management UI

**วัตถุประสงค์:** ให้ Admin อนุมัติหรือปฏิเสธรีวิวจากหน้าเว็บ

#### UI Layout — Tab "⭐ รีวิว"

```
[ Filter: รอ Approve | Active | Rejected ]

┌──────────────────────────────────────────────────────────────────────┐
│ ผู้รีวิว         │ ผู้ติดตั้ง      │ ดาว │ รีวิว (ย่อ)      │ Actions │
├──────────────────────────────────────────────────────────────────────┤
│ สมชาย ใจดี      │ Eco Solar Pro  │ ★★★★★│ "ติดตั้งเร็ว..." │ ✅ ❌ 👁️ │
└──────────────────────────────────────────────────────────────────────┘
```

**Actions ต่อแถว:**
- ✅ Approve → `PUT /api/admin/reviews/:id` `{ action: "approve" }`
- ❌ Reject → `PUT /api/admin/reviews/:id` `{ action: "reject" }`
- 👁️ ดูเต็ม → expand แสดง body เต็ม + install_date + email ผู้รีวิว

> `PUT /api/admin/reviews/:id` มีอยู่แล้ว — ไม่ต้องแก้ backend

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `GET /api/admin/reviews?status=pending|active|rejected&page=N`
- `admin.html` — Tab "⭐ รีวิว": filter status, ตาราง, expand row แสดง body เต็ม, actions Approve/Reject

---

### Phase 6D — Lead Management UI

**วัตถุประสงค์:** ให้ Admin ดู Lead ทั้งหมดจากทุก installer ในมุมมองเดียว

#### UI Layout — Tab "📋 Lead"

```
[ Filter: ทั้งหมด | new | contacted | closed ]   [ 📍 จังหวัด ▼ ]   [ 🔍 ค้นหาชื่อ ]

┌──────────────────────────────────────────────────────────────────────────────┐
│ ชื่อลูกค้า │ จังหวัด    │ ส่งเมื่อ   │ ผู้ติดตั้ง       │ สถานะ      │ Actions │
├──────────────────────────────────────────────────────────────────────────────┤
│ สมหญิง ดี │ กรุงเทพฯ  │ 9 พ.ค. 69 │ Eco Solar Pro  │ 🔵 new     │ 👁️ ✏️    │
│ สมชาย ใจ │ เชียงใหม่  │ 8 พ.ค. 69 │ (ไม่ระบุ)       │ 🟡 contacted│ 👁️ ✏️    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Actions ต่อแถว:**
- 👁️ ดูรายละเอียด → modal แสดง name, email, phone, province, message
- ✏️ Assign installer → dropdown เลือก installer ที่ active แล้ว save

**Assign Lead (ใหม่):**
```
PUT /api/admin/leads/:id/assign   — กำหนด installer_id ให้ lead
```

#### API Endpoints ใหม่

```
GET /api/admin/leads?status=new&province=XX&page=1   — ดู lead ทั้งหมด (Admin, พร้อม filter)
PUT /api/admin/leads/:id/assign                       — assign lead ไปยัง installer
```

> `GET /api/leads` เดิม (Phase 1) ยังใช้งานได้ แต่ไม่มี filter — สร้าง endpoint ใหม่แทน

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `GET /api/admin/leads?status&province&q&page` + `PUT /api/admin/leads/:id/assign` (ตรวจสอบว่า installer เป็น active ก่อน assign)
- `admin.html` — Tab "📋 Lead": filter (status/ค้นหา), ตาราง, modal ดูรายละเอียด + assign dropdown

---

### Phase 6E — Content Management

**วัตถุประสงค์:** ให้ Admin แก้ไข Content สำคัญในหน้าแรกและหน้า installer-detail ได้จาก Admin Panel โดยไม่ต้องแก้ไฟล์ HTML โดยตรง

#### Content ที่แก้ไขได้

| Section | Key | ประเภท | ตัวอย่าง |
|---------|-----|--------|---------|
| Hero headline | `hero_headline` | text | "ค้นหาผู้ติดตั้งโซลาร์เซลล์ที่ดีที่สุด" |
| Hero subheadline | `hero_sub` | text | "รวบรวมผู้ติดตั้งกว่า 12 ราย..." |
| Hero CTA ปุ่ม 1 | `hero_cta1` | text | "ค้นหาผู้ติดตั้ง" |
| Hero CTA ปุ่ม 2 | `hero_cta2` | text | "เริ่มคำนวณทันที" |
| Stats card 1 | `stat1_number` / `stat1_label` | text | "12+" / "ผู้ติดตั้งที่ตรวจสอบแล้ว" |
| Stats card 2 | `stat2_number` / `stat2_label` | text | "77" / "จังหวัดทั่วไทย" |
| Stats card 3 | `stat3_number` / `stat3_label` | text | "500+" / "โครงการที่สำเร็จแล้ว" |
| FAQ ข้อ 1–4 | `faq1_q` / `faq1_a` … `faq4_q` / `faq4_a` | text | คำถาม/คำตอบ 4 ข้อ |

#### Schema — ตาราง `site_content`

```sql
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### API Endpoints ใหม่

```
GET  /api/content              — ดึง content ทั้งหมด (สาธารณะ — ใช้โดย index.html)
GET  /api/admin/content        — ดึง content ทั้งหมด (Admin)
PUT  /api/admin/content/:key   — แก้ไข content รายการเดียว (ต้อง adminAuth)
```

#### Frontend — index.html รับ Content จาก API

```js
// index.html — โหลด content จาก API แทน hardcode
fetch('/api/content')
  .then(r => r.json())
  .then(data => {
    document.querySelector('.hero-title').textContent = data.hero_headline;
    document.querySelector('.hero-sub').textContent   = data.hero_sub;
    // ... และ field อื่นๆ
  });
```

**Fallback:** ถ้า API ไม่ตอบ หรือ key ไม่มีใน DB → ใช้ค่า default ที่ hardcode ไว้ใน HTML

#### UI Layout — Tab "📝 Content"

```
┌─────────────────────────────────────────────────────┐
│ 📝 จัดการ Content                                    │
├─────────────────────────────────────────────────────┤
│ ▸ Hero Section                                       │
│   Headline:     [ ค้นหาผู้ติดตั้ง...          ] ✏️  │
│   Subheadline:  [ รวบรวมผู้ติดตั้งกว่า...     ] ✏️  │
│   CTA ปุ่ม 1:  [ ค้นหาผู้ติดตั้ง            ] ✏️  │
│   CTA ปุ่ม 2:  [ เริ่มคำนวณทันที            ] ✏️  │
│                                                     │
│ ▸ Stats Section                                      │
│   Card 1:  ตัวเลข [ 12+ ]  ข้อความ [ ผู้ติดตั้ง ] ✏️ │
│   Card 2:  ตัวเลข [ 77  ]  ข้อความ [ จังหวัด   ] ✏️ │
│   Card 3:  ตัวเลข [ 500+]  ข้อความ [ โครงการ   ] ✏️ │
│                                                     │
│ ▸ FAQ (ใน installer-detail)                          │
│   Q1: [ ใช้เวลาติดตั้งนานแค่ไหน?          ] ✏️      │
│   A1: [ โดยทั่วไปใช้เวลา 1–3 วันทำการ...  ] ✏️      │
│   ...                                               │
│                                      [ บันทึกทั้งหมด ] │
└─────────────────────────────────────────────────────┘
```

#### Seed Data (ค่า default เริ่มต้น)

```js
const DEFAULT_CONTENT = {
  hero_headline:  'ค้นหาผู้ติดตั้งโซลาร์เซลล์ที่ดีที่สุดในไทย',
  hero_sub:       'รวบรวมผู้ติดตั้งที่ผ่านการตรวจสอบกว่า 12 ราย ครอบคลุมทั่วประเทศ',
  hero_cta1:      'ค้นหาผู้ติดตั้ง',
  hero_cta2:      'เริ่มคำนวณทันที',
  stat1_number:   '12+',
  stat1_label:    'ผู้ติดตั้งที่ตรวจสอบแล้ว',
  stat2_number:   '77',
  stat2_label:    'จังหวัดทั่วไทย',
  stat3_number:   '500+',
  stat3_label:    'โครงการที่สำเร็จแล้ว',
  faq1_q: 'ใช้เวลาติดตั้งนานแค่ไหน?',
  faq1_a: 'โดยทั่วไปใช้เวลา 1–3 วันทำการ ขึ้นอยู่กับขนาดระบบและสภาพหลังคา',
  faq2_q: 'ต้องเตรียมอะไรบ้างก่อนติดตั้ง?',
  faq2_a: 'หลังคาต้องแข็งแรงเพียงพอ ทางบริษัทจะสำรวจหน้างานฟรีก่อนติดตั้ง',
  faq3_q: 'หลังติดตั้งแล้วดูแลยากไหม?',
  faq3_a: 'ทำความสะอาดแผงปีละ 1–2 ครั้งก็เพียงพอ ระบบทำงานอัตโนมัติ',
  faq4_q: 'ค่าไฟจะลดได้มากแค่ไหน?',
  faq4_a: 'เฉลี่ย 60–80% บางรายได้มากกว่า 90% ขึ้นอยู่กับขนาดระบบและพฤติกรรมการใช้ไฟ',
};
```

`seedContent()` ทำงานตอน server start — INSERT หรือ IGNORE ถ้ามีอยู่แล้ว

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่มตาราง `site_content`, `seedContent()` (16 keys), routes `GET /api/content`, `GET /api/admin/content`, `PUT /api/admin/content/:key`
- `admin.html` — Tab "📝 Content": แบ่ง 3 section (Hero, Stats, FAQ), แต่ละ field มี `data-key`, ปุ่ม "บันทึกทั้งหมด" ส่ง PUT พร้อมกันทุก key

**ข้อสังเกต:**
- `index.html` และ `installer-detail.html` ยังเป็น hardcode — ต้องทำใน Phase ถัดไปถ้าต้องการ dynamic content จริง
- `seedContent()` ใช้ `INSERT OR IGNORE` — ปลอดภัยถ้า restart server ซ้ำ

---

### Phase 6F — Admin Overview Dashboard

**วัตถุประสงค์:** หน้าแรกของ Admin Panel แสดงภาพรวมสถานะระบบทั้งหมด

#### UI Layout — Tab "🏠 ภาพรวม"

```
┌───────────────────────────────────────────────────────────────┐
│  📊 ภาพรวมระบบ                                                 │
├──────────────┬──────────────┬──────────────┬──────────────────┤
│ 🟡 รอ Approve│ 🟢 Active    │ ⛔ Suspended │ ⭐ รีวิวรอ Approve│
│   ผู้ติดตั้ง │   ผู้ติดตั้ง │   ผู้ติดตั้ง │                  │
│     [N]      │     [N]      │     [N]      │       [N]        │
├──────────────┴──────────────┴──────────────┴──────────────────┤
│ 📋 Lead วันนี้: [N]    Lead ทั้งหมด: [N]    Lead ยังไม่ติดต่อ: [N] │
└───────────────────────────────────────────────────────────────┘

📋 Lead ล่าสุด 5 รายการ
┌──────────────────────────────────────────────────┐
│ ชื่อ       │ จังหวัด  │ ส่งเมื่อ   │ ผู้ติดตั้ง │
└──────────────────────────────────────────────────┘

🟡 รอ Approve (แสดงเฉพาะถ้ามี)
• ผู้ติดตั้ง 3 ราย รอ Approve  → [ไปหน้าจัดการ]
• รีวิว 2 รายการ รอ Approve    → [ไปหน้าจัดการ]
```

#### API Endpoint ใหม่

```
GET /api/admin/stats   — ดึง summary stats ทั้งหมดในครั้งเดียว
```

**Response:**
```json
{
  "installers": { "pending": 3, "active": 10, "suspended": 1 },
  "leads": { "today": 5, "total": 142, "new": 12 },
  "reviews": { "pending": 2, "active": 87 },
  "recent_leads": [
    { "id": 1, "name": "สมหญิง", "province": "กรุงเทพฯ", "created_at": "...", "installer_name": "Eco Solar" }
  ]
}
```

#### Implementation Notes (✅ Done)

**ไฟล์ที่แก้ไข:**
- `backend/node/server.js` — เพิ่ม `GET /api/admin/stats` (query installers/leads/reviews counts + recent_leads 5 รายการ)
- `admin.html` — Tab "🏠 ภาพรวม": 4 stat cards (pending/active/review pending/leads today), alert banner ถ้ามี pending items พร้อม link ไป tab จัดการ, ตาราง recent leads

---

### โครงสร้างหน้า admin.html

```
admin.html
├── Auth Guard (redirect → login.html ถ้าไม่มี token / role ≠ admin)
├── Sidebar Navigation
│   ├── 🏠 ภาพรวม         (Phase 6F)
│   ├── 👥 ผู้ติดตั้ง      (Phase 6B)
│   ├── ⭐ รีวิว           (Phase 6C)
│   ├── 📋 Lead            (Phase 6D)
│   ├── 📝 Content         (Phase 6E)
│   └── 🚪 Logout
└── Main Content Area (เปลี่ยนตาม tab ที่เลือก)
```

**Badge แจ้งเตือน:** sidebar แสดงจำนวน pending บนไอคอน "👥" และ "⭐" (โหลดจาก `GET /api/admin/stats`)

---

### API Endpoints สรุป Phase 6

| Method | Endpoint | Auth | คำอธิบาย | สถานะ |
|--------|----------|------|---------|-------|
| POST | `/api/admin/seed` | JWT_SECRET | สร้าง admin account ครั้งแรก | ใหม่ |
| GET | `/api/admin/stats` | adminAuth | Overview stats | ใหม่ |
| PUT | `/api/admin/installers/:id` | adminAuth | แก้ไขข้อมูล installer | ใหม่ |
| GET | `/api/admin/reviews` | adminAuth | ดูรีวิวทั้งหมด + filter | ใหม่ |
| GET | `/api/admin/leads` | adminAuth | ดู lead ทั้งหมด + filter | ใหม่ |
| PUT | `/api/admin/leads/:id/assign` | adminAuth | Assign lead → installer | ใหม่ |
| GET | `/api/content` | สาธารณะ | ดึง site content | ใหม่ |
| GET | `/api/admin/content` | adminAuth | ดึง site content (Admin) | ใหม่ |
| PUT | `/api/admin/content/:key` | adminAuth | แก้ไข content | ใหม่ |
| GET | `/api/admin/installers` | adminAuth | ดูรายการผู้ติดตั้ง | มีอยู่แล้ว |
| PUT | `/api/admin/installers/:id/approve` | adminAuth | approve/reject/suspend | มีอยู่แล้ว |
| PUT | `/api/admin/reviews/:id` | adminAuth | approve/reject รีวิว | มีอยู่แล้ว |

---

### Schema เพิ่มเติม

```sql
-- ตาราง site_content (Phase 6E)
CREATE TABLE IF NOT EXISTS site_content (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> ตาราง `installers` และ `leads` ไม่ต้องเปลี่ยน — ใช้ columns ที่มีอยู่แล้ว

---

### ไฟล์ที่ต้องสร้าง/แก้ไข (สรุป)

| ไฟล์ | Action | เหตุผล |
|------|--------|--------|
| `admin.html` | สร้างใหม่ | หน้า Admin Panel ทั้งหมด |
| `backend/node/server.js` | แก้ไข | เพิ่ม 9 endpoints ใหม่ + ตาราง site_content |
| `login.html` | แก้ไขเล็กน้อย | redirect ไป admin.html ถ้า role = admin |
| `index.html` | แก้ไขเล็กน้อย | โหลด Hero/Stats text จาก `GET /api/content` |
| `installer-detail.html` | แก้ไขเล็กน้อย | โหลด FAQ จาก `GET /api/content` |
| `styles.css` | แก้ไข | เพิ่ม admin layout styles |

---

### Security

- Admin token เก็บใน `localStorage` key `adminToken` แยกจาก installer (`installerToken`)
- ทุก admin route ใช้ `adminAuth` middleware (ตรวจ `role === 'admin'`)
- `POST /api/admin/seed` ป้องกันด้วย `JWT_SECRET` และ reject ถ้า admin มีอยู่แล้ว
- Admin Panel block ด้วย `robots.txt` (`Disallow: /admin.html`)

---

### Implementation Notes

**ลำดับแนะนำในการพัฒนา:**
1. **6A** — Admin Login ก่อน (foundation ของทุกอย่าง)
2. **6F** — Overview Dashboard (ทำได้เร็ว เห็นผลทันที)
3. **6B** — Installer Management (สำคัญที่สุดสำหรับ operation)
4. **6C** — Review Management (backend พร้อมแล้ว)
5. **6D** — Lead Management (backend พร้อมบางส่วน)
6. **6E** — Content Management (ต้องทำ schema + frontend ใหม่ — ทำสุดท้าย)

---

## Phase 7 — Email Notifications System

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
ระบบส่งอีเมลอัตโนมัติครบวงจรสำหรับทุก event สำคัญ พร้อมให้ Admin แก้ไข SMTP settings ได้จาก Admin Panel โดยไม่ต้องแก้ไฟล์ .env

### Dynamic SMTP

SMTP credentials เก็บใน `site_content` table (key: `smtp_user`, `smtp_pass`) โดย:
- **ค่าเริ่มต้น:** seed จาก env vars (`SMTP_USER`, `SMTP_PASS`) หรือ default `solarpanel.support@gmail.com`
- **เปลี่ยนได้ทันที:** Admin แก้ไขผ่าน Admin Panel → บันทึกลง DB → มีผลทันทีโดยไม่ต้อง restart server
- **ลำดับความสำคัญ:** DB > env vars > ไม่ส่ง (ถ้าไม่มีทั้งคู่)

### อีเมลทั้งหมดที่ระบบส่ง

#### ส่วน ผู้ติดตั้ง (Installer)

| เหตุการณ์ | Subject | เงื่อนไข |
|-----------|---------|---------|
| ยืนยันการสมัคร (manual mode) | `[Solar Panel] ยืนยันการสมัครผู้ติดตั้ง` | POST /api/auth/register + mode=manual |
| ยืนยันการสมัคร (auto mode) | `[Solar Panel] ยืนยันการสมัครผู้ติดตั้ง` | POST /api/auth/register + mode=auto |
| ลืมรหัสผ่าน | `[Solar Panel] รีเซ็ตรหัสผ่าน` | POST /api/auth/forgot-password |
| ได้รับ Lead ใหม่ | `[Solar Panel] มี Lead ใหม่จากจังหวัด{X}!` | POST /api/contact (มี installer_id) หรือ PUT /api/admin/leads/:id/assign |
| การสมัครได้รับการอนุมัติ | `[Solar Panel] บัญชีของคุณได้รับการอนุมัติแล้ว!` | PUT /api/admin/installers/:id/approve (action=approve) |
| มีรีวิวใหม่จากลูกค้า | `[Solar Panel] มีรีวิวใหม่ (X/5) จากลูกค้า` | POST /api/reviews (auto-verify) หรือ GET /api/reviews/:id/verify หรือ PUT /api/admin/reviews/:id (approve) |

#### ส่วน ผู้สนใจติดตั้ง (Customer)

| เหตุการณ์ | Subject | เงื่อนไข |
|-----------|---------|---------|
| ยืนยันรับคำขอใบเสนอราคา | `[Solar Panel] รับคำขอใบเสนอราคาของคุณแล้ว` | POST /api/contact (ทุก lead) |
| ยืนยันอีเมลก่อนเผยแพร่รีวิว | `[Solar Panel] ยืนยันรีวิวของคุณ` | POST /api/reviews (เมื่อตั้ง SMTP) |

#### ส่วน Admin

| เหตุการณ์ | Subject | เงื่อนไข |
|-----------|---------|---------|
| มี Lead ใหม่เข้าระบบ | `[Solar Panel] Lead ใหม่จาก {name}` | POST /api/contact (ทุก lead) |
| มีผู้ติดตั้งใหม่ขอสมัคร | `[Solar Panel] ผู้ติดตั้งใหม่ขอสมัคร: {name}` | POST /api/auth/register + mode=manual |

### Email Template

ทุก email ใช้ `emailLayout(title, bodyHtml)` — HTML email พร้อม branding:
- Header: gradient teal `#00b8a0 → #00d4b8` + ชื่อ Solar Panel Thailand
- Body: สีขาว + ตาราง/ปุ่ม CTA สีเขียว
- Footer: copyright

### Admin SMTP Settings UI

**หน้า:** `admin.html` → Tab "⚙️ ตั้งค่า SMTP"

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| แก้ไข Gmail | input type=email |
| แก้ไข App Password | input type=password + toggle แสดง/ซ่อน |
| ทดสอบ | ปุ่ม "📤 ทดสอบส่งอีเมล" → ส่ง test email ไปที่ smtp_user เอง |
| ตารางสรุป | แสดง event ทั้งหมดที่ระบบส่ง |

### API Endpoints ใหม่

```
GET  /api/admin/smtp        — ดูการตั้งค่า (password masked)
PUT  /api/admin/smtp        — บันทึก smtp_user + smtp_pass ลง site_content
POST /api/admin/smtp/test   — ส่ง test email ไปที่ smtp_user ปัจจุบัน
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | Dynamic SMTP (`getSmtpCreds()`), `emailLayout()`, 5 email functions ใหม่, อัปเดต 5 routes, 3 admin SMTP endpoints |
| `admin.html` | Tab "⚙️ ตั้งค่า SMTP" + SMTP form + JS (loadSmtpSettings/saveSmtp/testSmtp/toggleSmtpPass) |
| `backend/node/.env.example` | อัปเดต SMTP_USER/SMTP_PASS default |

### ข้อสังเกต
- SMTP credentials เก็บใน DB เป็น plaintext (เหมาะสำหรับ self-hosted)
- Gmail ต้องใช้ **App Password** (ไม่ใช่รหัสผ่านปกติ) — เปิดที่ myaccount.google.com/apppasswords
- ถ้าไม่มี SMTP creds → ระบบยังทำงานได้ปกติ แค่ไม่ส่ง email (reviews auto-verify ทันที)
- `ADMIN_EMAIL` (ผู้รับฝั่ง Admin) ยังคงใช้ค่าจาก env var

---

## Phase 8 — Quote Request with Calc Data

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ลูกค้าส่งข้อมูลการคำนวณพร้อมคำขอใบเสนอราคา ทั้งแบบอัปโหลด PDF และแบบส่ง JSON data จาก calculator widget

### ฟีเจอร์

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| อัปโหลด PDF | multer รับ field `calc_file` → บันทึกใน `uploads/calc/calc-{timestamp}.pdf` |
| ส่ง JSON | field `calc_data` (JSON string จาก calculator widget) บันทึกใน `leads.calc_data` |
| Email แนบข้อมูล | Admin notification email แสดงตาราง calc data และแจ้งมีไฟล์แนบ |
| Serve PDF | `express.static('/uploads')` → `GET /uploads/calc/<filename>` คืนไฟล์ PDF ตรงๆ |

### DB
- `leads.calc_data` TEXT — JSON จาก calculator (system_kw, totalCost, monthlySavings, paybackYears ฯลฯ)
- `leads.calc_file` TEXT — path เช่น `/uploads/calc/calc-1778599577033.pdf`
- `leads.system_kw` REAL — ขนาดระบบ kW แยกเก็บเพื่อ query ง่าย

### API
```
POST /api/contact   — รองรับ multipart/form-data (calc_file + calc_data + ฟิลด์ปกติ)
GET  /uploads/*     — serve static files (express.static middleware)
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | multer config สำหรับ calc PDF, `addCol` leads.system_kw/calc_data/calc_file, `calcDataHtml()`, อัปเดต `/api/contact`, `express.static('/uploads')` |

---

## Phase 8.1 — Lead Attachment Display in Installer Dashboard

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ผู้ติดตั้งเห็นไฟล์ PDF หรือข้อมูลการคำนวณที่ลูกค้าแนบมาใน Lead list บน Dashboard และสามารถเปิดดูได้

### ฟีเจอร์
- คอลัมน์ **"ไฟล์แนบ"** ใหม่ใน Lead table ของ `dashboard.html`
- ถ้ามี `calc_file` → ลิงก์ 📎 PDF (เปิด tab ใหม่)
- ถ้ามี `calc_data` แต่ไม่มีไฟล์ → badge 📊 ข้อมูลคำนวณ
- ถ้าไม่มีทั้งคู่ → แสดง `—`

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `dashboard.html` | เพิ่ม `<th>ไฟล์แนบ</th>`, colspan 8→9, เพิ่ม cell ใน `renderLeadsTable()` |
| `styles.css` | `.lead-attach`, `.lead-pdf-link`, `.lead-calcdata-badge` |
| `backend/node/server.js` | `app.use('/uploads', express.static(...))` — serve uploaded files |

---

## Phase 9 — Support / Contact Messages

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
ระบบรับข้อความจากผู้ใช้ผ่านหน้า "ติดต่อเรา" — ส่งอีเมลแจ้งเตือนทีมงาน และบันทึกข้อความให้ Admin ดูและจัดการได้ใน Admin Panel

### ฟีเจอร์

| ส่วน | รายละเอียด |
|------|-----------|
| ตาราง `contact_messages` | name, email, phone, subject, message, status (new/read/resolved) |
| `POST /api/contact-message` | บันทึกข้อความ + ส่งอีเมลไปยัง `support_email` จาก site_content |
| Email notification | ส่งไปที่ support_email ทันทีที่มีข้อความใหม่ |
| Admin tab "💬 Support" | ดูข้อความทั้งหมด, filter status, dropdown เปลี่ยนสถานะแต่ละรายการ, pagination |
| Badge ใน sidebar | แสดงจำนวนข้อความ status=new |
| support_email setting | Admin Settings → "📬 อีเมลสำหรับเมนู ติดต่อเรา" — บันทึกลง `site_content` |
| ค่าเริ่มต้น | `solarpanel.support@gmail.com` (seed ครั้งแรก) |

### DB — ตาราง contact_messages

```sql
CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT    NOT NULL,
  status     TEXT    DEFAULT 'new',   -- new | read | resolved
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### site_content Key ใหม่

| Key | ค่าเริ่มต้น | คำอธิบาย |
|-----|------------|---------|
| `support_email` | `solarpanel.support@gmail.com` | อีเมลรับข้อความจากหน้าติดต่อเรา |

### API Endpoints ใหม่

```
POST /api/contact-message                    — ส่งข้อความ (public, rate-limited)
GET  /api/admin/contact-messages             — รายการข้อความ + ?status=new|read|resolved&page=N
PUT  /api/admin/contact-messages/:id/status  — อัปเดตสถานะ (new/read/resolved)
GET  /api/admin/content/support_email        — ดูค่า (ผ่าน content endpoint เดิม)
PUT  /api/admin/content/support_email        — แก้ไข support email
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | ตาราง `contact_messages`, seed `support_email`, `sendContactSupportEmail()`, `POST /api/contact-message`, `GET/PUT /api/admin/contact-messages` |
| `contact.html` | endpoint → `/api/contact-message`, เพิ่มช่อง "หัวข้อ" (dropdown), แสดง support_email dynamic |
| `admin.html` | nav link "💬 Support" + badge, tab `#tab-support` (table + filter + pagination), Settings card "📬 อีเมลสำหรับเมนู ติดต่อเรา", JS: `loadContactMsgs()`, `updateContactStatus()`, `loadSupportEmail()`, `saveSupportEmail()` |

---

## Phase 10 — Featured Blogs on Homepage

> สถานะ: **✅ Implemented**

### วัตถุประสงค์
แสดงบทความแนะนำสูงสุด 4 อันที่หน้าแรก — Admin เลือกเองได้ผ่าน Admin Panel โดยกดปุ่ม ⭐ toggle ในตาราง บทความ

### ฟีเจอร์

| ส่วน | รายละเอียด |
|------|-----------|
| `featured` column | เพิ่มใน blogs table (INTEGER DEFAULT 0) — migration แบบ `ALTER TABLE ... ADD COLUMN` |
| `GET /api/blogs/featured` | ดึง blog ที่ `featured=1 AND status='active'` เรียงตาม `published_at DESC` สูงสุด 4 อัน (public) |
| `PUT /api/admin/blogs/:id/featured` | toggle featured (Admin JWT) — จำกัดสูงสุด 4 อัน ถ้าเกินจะ return 400 |
| หน้าแรก (`index.html`) | Section "บทความแนะนำ" (`#home-blogs`) — grid 4 คอลัมน์, fetch `/api/blogs/featured` |
| Admin Panel (`admin.html`) | คอลัมน์ "หน้าแรก" ในตาราง บทความ + ปุ่ม ⭐/☆ toggle |

### DB Migration

```sql
ALTER TABLE blogs ADD COLUMN featured INTEGER DEFAULT 0;
-- รัน runtime (try/catch) เพื่อรองรับ DB ที่มีอยู่แล้ว
```

### API Endpoints ใหม่

```
GET /api/blogs/featured                  — บทความ featured สำหรับหน้าแรก (public)
PUT /api/admin/blogs/:id/featured        — toggle featured true/false (Admin JWT)
                                           body: { "featured": 1 | 0 }
                                           จำกัด: featured=1 ได้สูงสุด 4 บทความ
```

### index.html — Section บทความแนะนำ

- อยู่ระหว่าง Section "ทำไมต้องเรา" กับ Section CTA ติดต่อเรา
- Grid CSS class: `.blog-preview-grid` — responsive 4→2→1 คอลัมน์
- Card: `.blog-preview-card` — cover image (16/9), category badge, title (link), excerpt (3-line clamp), author + date
- ถ้า API ไม่มีข้อมูล → ซ่อน grid (ไม่แสดง placeholder)
- ปุ่ม "📰 อ่านบทความทั้งหมด →" ลิงก์ไป `blog.html`

### Admin Panel — Blog Tab

- เพิ่มคอลัมน์ "หน้าแรก" (6 คอลัมน์รวม)
- ปุ่ม toggle: ⭐ แสดงอยู่ (สี primary) / ☆ เพิ่ม (สีเทา)
- กดแล้วเรียก `PUT /api/admin/blogs/:id/featured` → reload ตาราง + toast notification
- หมายเหตุ: "เลือกได้สูงสุด 4 บทความ" แสดงเหนือตาราง

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | Migration `featured` column, `GET /api/blogs/featured`, `PUT /api/admin/blogs/:id/featured`, เพิ่ม `featured` ใน SELECT ของ `GET /api/admin/blogs` |
| `index.html` | Section `#home-blogs` (HTML + inline JS fetch + render), CSS class `.blog-preview-*` |
| `styles.css` | CSS ใหม่: `.blog-preview-grid`, `.blog-preview-card`, `.blog-preview-img`, `.blog-preview-body`, `.blog-preview-cat`, `.blog-preview-title`, `.blog-preview-excerpt`, `.blog-preview-meta` |
| `admin.html` | เพิ่มคอลัมน์ "หน้าแรก" ในตาราง blog, ปุ่ม toggle, ฟังก์ชัน `toggleFeatured()` |

---

## Phase 11 — Site Logo Upload + Blog Cover Image + Dynamic Favicon

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ Admin อัพโหลดโลโก้เว็บไซต์ได้จาก Admin Panel และใส่รูปปกบทความในฟอร์มเขียนบทความ เพื่อให้เว็บดูน่าสนใจและมีเอกลักษณ์มากขึ้น

### ฟีเจอร์

#### 1. Site Logo Upload (Admin → ⚙️ ตั้งค่า)
- Upload รูปโลโก้เว็บไซต์ (JPG/PNG/WebP/SVG สูงสุด 2MB)
- Preview ก่อนอัพโหลด + แสดงโลโก้ปัจจุบัน
- ลบโลโก้ได้ (ลบไฟล์จาก disk + ลบ record ใน `site_content`)
- โลโก้แสดงใน Admin sidebar brand area แทน emoji ☀️
- โลโก้แสดงใน header ทุกหน้า (nav-component.js fetch `/api/content`)

#### 2. Blog Cover Image Upload (Admin → 📰 บทความ → เพิ่ม/แก้ไข)
- อัพโหลดรูปปกในฟอร์ม modal (JPG/PNG/WebP สูงสุด 5MB)
- รูปถูก upload ทันทีเมื่อเลือกไฟล์ → ได้ URL กลับมา → เก็บใน hidden input
- Preview 140×84px ใน modal พร้อมปุ่ม "🗑️ ลบรูป"
- URL รูปปกถูกบันทึกลง `cover_image` column ของ blogs table
- รูปปกแสดงในทุกหน้าที่มี blog card (blog.html, blog-post.html, index.html)

#### 3. Dynamic Favicon
- `nav-component.js` set `<link rel="icon">` ชี้ไปที่ Site Logo URL โดยอัตโนมัติ
- มีผลทุกหน้าที่โหลด nav-component.js
- ถ้าไม่มีโลโก้ → ใช้ browser default favicon

### API Endpoints ใหม่

```
POST /api/admin/upload/site-logo    — อัพโหลดโลโก้เว็บไซต์
                                      body: multipart/form-data (field: logo)
                                      response: { success, logo_url }
                                      บันทึก logo_url ลง site_content table

DELETE /api/admin/settings/logo     — ลบโลโก้เว็บไซต์
                                      ลบไฟล์จาก uploads/site/ + ลบ record ใน site_content

POST /api/admin/upload/blog-image   — อัพโหลดรูปปกบทความ
                                      body: multipart/form-data (field: image)
                                      response: { success, url }
                                      บันทึกไฟล์ใน uploads/blog/blog-{timestamp}.ext
```

### Storage

| Directory | ขนาดสูงสุด | ประเภทไฟล์ | หมายเหตุ |
|-----------|-----------|------------|---------|
| `uploads/site/` | 2MB | JPG/PNG/WebP/SVG | ไฟล์ชื่อ `logo.ext` (เขียนทับทุกครั้ง) |
| `uploads/blog/` | 5MB | JPG/PNG/WebP | ไฟล์ชื่อ `blog-{timestamp}.ext` |

### Cross-Origin-Resource-Policy Fix
Helmet.js ตั้งค่า CORP เป็น `same-origin` โดย default ทำให้ browser ที่เปิดจาก `localhost:8080` ไม่สามารถโหลดรูปจาก `localhost:3000/uploads/` ได้  
แก้โดยเพิ่ม middleware เฉพาะ route `/uploads`:

```js
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(...));
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | เพิ่ม `SITE_DIR`, `BLOG_IMG_DIR`, `siteLogoStorage`, `blogImgStorage`, 3 endpoints ใหม่, CORP middleware |
| `admin.html` | Logo upload card ใน tab ตั้งค่า, Cover image section ใน blog modal, functions: `loadSiteLogo()`, `setSiteLogoUI()`, `uploadSiteLogo()`, `deleteSiteLogo()`, `uploadBlogCover()`, `setBlogCoverUI()`, `clearBlogCover()` |
| `nav-component.js` | โหลดโลโก้จาก `/api/content` → แสดงใน header, set favicon dynamic, ขยาย logo size เป็น height:55px |

---

## Phase 12 — PDF Improvements + Calculator Prices จาก Admin

> Priority: **High** | Effort: **M** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
1. ปุ่ม "ดาวน์โหลดใบเสนอราคา" ต้องแจ้งเตือนและบล็อกถ้ากรอกข้อมูลไม่ครบ
2. PDF ใช้โลโก้เว็บจาก Admin แทน hardcoded text
3. ข้อความ disclaimer ใน PDF ต้องแสดงเป็นสีแดง
4. ใส่ URL เว็บไซต์ที่ด้านล่าง PDF
5. ราคา On-grid/Hybrid (บาท/kW) และราคาแบตเตอรี่ทุกขนาด — ดึงจาก Admin ไม่ hardcode

### ฟีเจอร์

#### PDF Download (`calculator-widget.js` → `downloadPDF()`)
- `downloadPDF()` เปลี่ยนเป็น `async` function
- **Validation:** ตรวจสอบ `ค่าไฟต่อเดือน > 0` และ `ขนาดระบบ > 0` ก่อน generate PDF — ถ้าไม่ครบ `alert()` และ `focus()` ที่ช่องนั้น
- **Logo จาก Admin:** fetch `/api/content` → ถ้ามี `logo_url` → ใช้ `<img>` tag, ถ้าไม่มี → ใช้ fallback text "☀️ Solar Panel"
- **Disclaimer สีแดง:** `.note { color: #dc2626 }` ใน PDF HTML
- **URL เว็บ:** footer ของ PDF มี `https://solarpanel.com` เป็น link

#### Calculator Prices จาก Admin
- เพิ่ม 5 keys ใหม่ใน `site_content`:

| Key | Default | คำอธิบาย |
|-----|---------|---------|
| `calc_price_ongrid` | `45000` | ราคา On-grid รวม/kW (บาท) |
| `calc_price_hybrid` | `58000` | ราคา Hybrid รวม/kW (บาท) |
| `calc_bat5` | `50000` | ราคาแบตเตอรี่ 5 kWh (บาท) |
| `calc_bat10` | `90000` | ราคาแบตเตอรี่ 10 kWh (บาท) |
| `calc_bat15` | `125000` | ราคาแบตเตอรี่ 15 kWh (บาท) |

- `initCalcPrices()` — async IIFE ใน `calculator-widget.js` โหลดหลัง DOM ready: fetch `/api/content` → อัพเดต constants `HARDWARE_PER_KW`, `LABOR_PER_KW`, `BATTERY_PRICE` และ label text ใน option cards
- **สัดส่วน hardware/labor คงที่:** On-grid = 40/45, Hybrid = 51/58 — เมื่อราคารวม/kW เปลี่ยน ระบบแบ่งตามสัดส่วนเดิมโดยอัตโนมัติ

#### Battery Radio Value Refactor (Backward Compat)
- เดิม: `value="50000"` (ราคา) → ใหม่: `value="5"` (kWh size)
- `BATTERY_BONUS` keys เปลี่ยนจาก price → kWh size: `{ 0:0, 5:10, 10:18, 15:25 }`
- `BATTERY_PRICE` เปลี่ยนเป็น `let` (mutable) เพื่อให้ `initCalcPrices()` อัพเดตได้
- `installer-detail.html` — `<select id="qBattery">` ปรับ option values เป็น kWh size
- `server.js` `calcDataHtml()` และ `admin.html` `renderCalcData()` — เพิ่ม backward compat map รองรับทั้ง format เดิม (price) และใหม่ (kWh)

### Admin Panel — ส่วน "ราคาการคำนวณ"
เพิ่ม content-section ใหม่ในแท็บ Content:
- On-grid ราคา/kW (`calc_price_ongrid`)
- Hybrid ราคา/kW (`calc_price_hybrid`)
- แบตเตอรี่ 5/10/15 kWh (`calc_bat5`, `calc_bat10`, `calc_bat15`)
- บันทึกพร้อมกับปุ่ม "💾 บันทึกทั้งหมด" (ใช้ `data-key` pattern เดิม)

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `calculator-widget.js` | `downloadPDF()` → async + validation + logo fetch + disclaimer สีแดง + URL footer; เพิ่ม `initCalcPrices()` IIFE; เปลี่ยน battery radio values; refactor constants เป็น `let`; เพิ่ม `data-type`/`data-bat` attributes |
| `backend/node/server.js` | seedContent เพิ่ม 5 calc keys; `calcDataHtml()` battery backward compat |
| `admin.html` | เพิ่ม "ราคาการคำนวณ" section; `renderCalcData()` battery backward compat |
| `installer-detail.html` | `qBattery` option values → kWh size |

---

## Phase 13 — Page Header Theme (สี + รูปพื้นหลัง) จาก Admin

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
ให้ Admin ปรับสีหลักและรูปพื้นหลังของ Page Header ในทุกหน้าย่อย (เช่น installers.html) ได้จาก Admin Panel โดยไม่ต้องแก้ไข code

### ฟีเจอร์

| รายการ | รายละเอียด |
|--------|-----------|
| `brand_primary_color` | สี hex ที่ใช้เป็น gradient ของ Page Header (color picker ใน Admin) |
| Gradient อัตโนมัติ | ใช้สีหลัก + lighten +24 เป็น end color ของ `linear-gradient(135deg, ...)` |
| รูปพื้นหลัง | ถ้ามี `hero_bg_image` (homepage hero) หรือ `installers_header_image` (installers page) → ซ้อนใต้ gradient ด้วย opacity 88% (Phase 14: แยก key ออกจากกัน) |
| Color Picker | `input[type="color"]` ใน Admin → Hero Section (บันทึกพร้อม "💾 บันทึกทั้งหมด") |

### site_content Key ใหม่

| Key | Default | คำอธิบาย |
|-----|---------|---------|
| `brand_primary_color` | `#00b8a0` | สีหลักของ Page Header gradient ทุกหน้า |

### การทำงาน (`installers.html`)

```javascript
// Inline script ท้ายหน้า — fetch config แล้ว apply
const color    = d.brand_primary_color || '#00b8a0';
const colorEnd = lighten(color, 24);          // lighten +24 RGB units

if (d.hero_bg_image) {
  // Gradient overlay + background image
  header.style.background = `linear-gradient(135deg, rgba(r,g,b,0.88) 0%, ...), url('...') center/cover`;
} else {
  header.style.background = `linear-gradient(135deg, ${color} 0%, ${colorEnd} 100%)`;
}
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | seedContent เพิ่ม `brand_primary_color: '#00b8a0'` |
| `admin.html` | เพิ่ม `input[type="color"]` + `data-key="brand_primary_color"` ใน Hero Section |
| `installers.html` | เพิ่ม inline script ท้ายหน้า: fetch `/api/content` → apply สีและรูปให้ `.page-header` |

---

## Phase 14 — Installer Card UI + installers_header_image แยกจาก Hero

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
1. แยกรูปพื้นหลัง Page Header ของหน้า `installers.html` ออกจาก `hero_bg_image` ของ homepage — ตั้งค่าได้อิสระจาก Admin
2. ปรับ UI ของ Installer Card (list + detail) ให้ดูดีขึ้น

### ฟีเจอร์

#### 1. installers_header_image — รูปพื้นหลัง Page Header แยกหน้า
- เพิ่ม key ใหม่ `installers_header_image` ใน `site_content` (default: `''`)
- Admin Panel → Tab Content → Section "Installers Page — รูปพื้นหลัง Header"
  - Preview box (160×80px), status text, file input, upload/delete buttons
  - รูปแบบเดียวกับ hero_bg_image (JPG/PNG/WebP สูงสุด 5MB)
- `installers.html` inline script อ่าน `d.installers_header_image` แทน `d.hero_bg_image`
- **homepage hero section** และ **installers page header** ตอนนี้เป็นอิสระจากกัน

#### 2. Logo Placeholder ใน Installer Cards
- `installers.js` — fetch `/api/content` พร้อมกับ `/api/installers` (`Promise.all`)
- Installer ที่ไม่มีโลโก้ของตัวเอง (`logo_url = null`) → แสดง site logo (`logo_url` จาก site_content) แบบ grayscale จางๆ
  - Style: `filter: grayscale(1) opacity(0.35)`, ขนาด 78%×78%, `object-fit: contain`
- ถ้าไม่มี site logo → fallback เป็น `☀️` เหมือนเดิม
- `installer-detail.html` — เพิ่มโค้ด set `#companyLogo` หลัง fetch installer data:
  - มีโลโก้บริษัท → แสดงเต็ม box (`object-fit: cover`, `border-radius: 16px`)
  - ไม่มีโลโก้ → fetch `/api/content` แล้วแสดง site logo แบบ grayscale

#### 3. Logo Box Style เปลี่ยนเป็น White + Border
- `.icard-logo` (`styles.css`): `background: #fff`, `border: 1.5px solid var(--border)` (เดิม: `#e6f9f5`)
- `.company-logo` (`installer-detail.html`): เปลี่ยนจาก `linear-gradient teal` + box-shadow → `background: #fff; border: 1.5px solid var(--border)` (ลบ `overflow: hidden` ออกเพื่อให้ `.verified-mark` โผล่ได้)

#### 4. Installer Card Layout — Badge ใต้ชื่อ
- `.icard-header`: เปลี่ยนจาก `flex-direction: row; justify-content: space-between` → `flex-direction: column; align-items: flex-start; gap: 0.3rem`
- Badge "✓ ตรวจสอบแล้ว" ย้ายมาอยู่ใต้ชื่อบริษัทแทนที่จะอยู่ขวามือ

#### 5. ปุ่ม "ดูรายละเอียด"
- ลบลูกศร `→` ออก → เหลือแค่ "ดูรายละเอียด"
- `.card-link` เพิ่ม `font-size: 0.75rem` — ขนาดเดียวกับ badge "✓ ตรวจสอบแล้ว"

### site_content Key ใหม่

| Key | Default | คำอธิบาย |
|-----|---------|---------|
| `installers_header_image` | `''` | รูปพื้นหลัง Page Header ของหน้ารายชื่อผู้ติดตั้ง (แยกจาก hero_bg_image) |

### API Endpoints ใหม่

```
POST   /api/admin/upload/installers-header-image   — อัพโหลดรูปพื้นหลัง (Admin JWT, reuse heroImgUpload)
                                                     body: multipart/form-data (field: image)
                                                     บันทึกใน uploads/site/ + key: installers_header_image

DELETE /api/admin/settings/installers-header-image — ลบรูปพื้นหลัง (Admin JWT)
                                                     ลบไฟล์จาก disk + reset key เป็น ''
```

### Storage

| Directory | ใช้สำหรับ |
|-----------|---------|
| `uploads/site/` | installers_header_image (ชื่อไฟล์เหมือน hero-bg — ขึ้นกับ timestamp) |

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | seedContent เพิ่ม `installers_header_image: ''`; เพิ่ม `POST /api/admin/upload/installers-header-image` และ `DELETE /api/admin/settings/installers-header-image` (reuse `heroImgUpload`) |
| `admin.html` | เพิ่ม section "Installers Page — รูปพื้นหลัง Header" ใน Tab Content (ระหว่าง Hero กับ Featured); JS functions: `setInstHeaderImgUI()`, `previewInstHeaderImg()`, `uploadInstHeaderImg()`, `deleteInstHeaderImg()`; `loadContent()` เพิ่ม `if (map.installers_header_image) setInstHeaderImgUI(...)` |
| `installers.html` | inline script: เปลี่ยน `d.hero_bg_image` → `d.installers_header_image` |
| `installers.js` | เพิ่ม `siteLogo` variable; fetch `Promise.all([/api/installers, /api/content])`; `renderCard()` ใช้ site logo grayscale เป็น fallback; ลบลูกศร `→` จากปุ่ม |
| `installer-detail.html` | เพิ่ม `setDetailLogo()` function + logic set `#companyLogo` หลัง fetch installer; `.company-logo` CSS เปลี่ยนเป็น white bg + border, ลบ gradient + overflow:hidden |
| `styles.css` | `.icard-logo`: `background: #fff`, `border: 1.5px solid var(--border)`; `.icard-header`: `flex-direction: column`, `gap: 0.3rem`; `.card-link`: เพิ่ม `font-size: 0.75rem` |

---

## Phase 15 — Social Login (OAuth) + Auth Pages + Social Auth Admin Panel

> Priority: **High** | Effort: **M** | สถานะ: **✅ Implemented**

### วัตถุประสงค์
1. สร้างหน้า `forgot-password.html` และ `reset-password.html` ที่ขาดหายไป (password reset flow ครบวงจร)
2. เพิ่มปุ่ม Social Login (Google, Facebook, X/Twitter, TikTok) ในหน้าเข้าสู่ระบบ
3. ให้ Admin จัดการ OAuth credentials (Client ID / Secret) และเปิด-ปิดแต่ละ provider ได้จาก Admin Panel
4. ปรับทุกหน้า auth ให้โหลดโลโก้จาก Admin แบบ dynamic (เหมือน nav-component)

---

### 15.1 — Auth Pages ที่สร้างใหม่

#### forgot-password.html
- URL: `http://localhost:8080/forgot-password.html`
- ฟอร์มกรอก email → `POST /api/auth/forgot-password`
- **Anti-enumeration:** แสดง success message เสมอ (ไม่บอกว่า email มีในระบบหรือไม่)
- ซ่อนฟอร์มหลังส่ง + ลิงก์กลับไป `login.html`
- โหลดโลโก้จาก `/api/content` แบบ dynamic (pattern เดียวกับ login/register)
- Redirect ไป `dashboard.html` ถ้า login อยู่แล้ว

#### reset-password.html
- URL: `http://localhost:8080/reset-password.html?token=...`
- อ่าน `?token=` จาก URL บน page load — ถ้าไม่มีให้แสดง error + ซ่อนฟอร์มทันที
- ฟิลด์: รหัสผ่านใหม่ + ยืนยันรหัสผ่าน (ทั้งคู่มี show/hide toggle)
- Client-side validation: ต้องตรงกัน + ≥8 ตัวอักษร
- `POST /api/auth/reset-password` → `{ token, password }`
- On success: แสดงข้อความสำเร็จ + auto-redirect ไป `login.html` หลัง 2.5 วินาที

---

### 15.2 — Social Login UI (login.html)

#### Social Buttons
- ปุ่ม 4 ช่องทาง: Google, Facebook, X (Twitter), TikTok
- Grid 2 คอลัมน์ (responsive: 1 คอลัมน์ที่ ≤420px)
- แต่ละปุ่มมี SVG icon ของแต่ละ platform
- ลิงก์ไปที่ `GET /api/auth/{provider}` → backend เริ่ม OAuth flow

#### Active Provider Control
- ปุ่มซ่อนทั้งหมดโดย default (`style="display:none"`)
- เมื่อ page load: fetch `GET /api/auth/providers` → แสดงเฉพาะ provider ที่ `active = 1`
- ถ้าไม่มี provider active เลย → ซ่อน divider "หรือเข้าสู่ระบบด้วย" ด้วย
- ใช้ `data-provider="google"` attribute บนแต่ละปุ่มเพื่อ match กับ API response

#### OAuth Callback Handler
```js
// รับ token จาก OAuth callback redirect (?oauth_token=...&oauth_user=...&oauth_error=...)
const oauthToken = p.get('oauth_token');
const oauthUser  = p.get('oauth_user');   // base64-encoded JSON
const oauthError = p.get('oauth_error');

if (oauthToken && oauthUser) {
  const user = JSON.parse(atob(oauthUser));
  localStorage.setItem('sp_token', oauthToken);
  localStorage.setItem('sp_user', JSON.stringify(user));
  window.location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
}
if (oauthError) { showFeedback(decodeURIComponent(oauthError), true); }
```

---

### 15.3 — Backend OAuth Routes (server.js)

#### สถาปัตยกรรม
- **ไม่มี dependency ใหม่** — ใช้ Node.js built-in `https` module สำหรับ token exchange
- **PKCE** สำหรับ X/Twitter OAuth 2.0 (required by Twitter API)
- In-memory `oauthStates` Map เก็บ state → codeVerifier, auto-cleanup ทุก 5 นาที
- Credentials อ่านจาก DB (`oauth_providers` table) ไม่ใช่ env var

#### OAuth Flow
```
GET /api/auth/{provider}
  → ตรวจ active + client_id จาก DB
  → สร้าง state (+ PKCE verifier สำหรับ Twitter)
  → redirect ไป provider's auth URL

GET /api/auth/{provider}/callback?code=...&state=...
  → ตรวจ state
  → แลก code → access_token (POST to provider)
  → ดึง user profile (GET from provider)
  → findOrCreateOAuthUser()
  → oauthSuccess() → redirect login.html?oauth_token=...&oauth_user=...
```

#### `findOrCreateOAuthUser(provider, providerId, profile)` — 3 ขั้น
1. **Match by oauth_id:** `WHERE oauth_provider = ? AND oauth_id = ?`
2. **Link by email:** ถ้ามี email → match existing account → update oauth_provider + oauth_id
3. **Create new account:** status ตาม `registration_mode` setting (auto/pending), `password_hash = ''`

#### `oauthSuccess(res, user)`
```js
const token   = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
const userB64 = Buffer.from(JSON.stringify({ id, name, email, role, logo_url })).toString('base64');
res.redirect(`${ALLOWED_ORIGIN}/login.html?oauth_token=...&oauth_user=...`);
```

#### Scopes ที่ขอ
| Provider | Scope |
|---------|-------|
| Google | `openid email profile` |
| Facebook | `email` |
| X/Twitter | `tweet.read users.read` (PKCE, no email scope) |
| TikTok | `user.info.basic` (no email scope) |

> **Twitter/TikTok ไม่มี email scope:** ใช้ `{provider}_{id}@oauth.local` เป็น placeholder email สำหรับ new accounts

---

### 15.4 — Social Auth Admin Panel (admin.html)

#### เมนูใหม่
- Sidebar: เพิ่ม **🔑 Social Auth** ถัดจาก ⚙️ ตั้งค่า

#### แท็บ Social Auth
- Grid 4 การ์ด (2 คอลัมน์ responsive) — 1 การ์ดต่อ 1 provider
- แต่ละการ์ดมี:
  - Border สีตาม brand (Google: #4285F4, Facebook: #1877f2, X: #111, TikTok: #ff0050)
  - **Toggle switch** เปิด/ปิด (เปลี่ยนสีและ label อัตโนมัติ)
  - **Client ID / App ID / Client Key** input (ชื่อ label ตาม platform)
  - **Client Secret / App Secret** input (password field + ปุ่มแสดง/ซ่อน)
  - ปุ่ม **💾 บันทึก** (save ต่อ provider ไม่ขึ้นกัน)
  - ข้อความยืนยัน/error fade ออกใน 3 วินาที

#### JS Functions
```js
loadOAuthProviders()      — GET /api/admin/oauth-providers → render 4 cards
saveOAuthProvider(p)      — PUT /api/admin/oauth-providers/:provider
toggleOAuthSecret(p, btn) — show/hide secret field
updateOAuthToggleLabel(p) — อัปเดต label เมื่อ toggle เปลี่ยน
```

---

### 15.5 — DB Schema ใหม่

#### ตาราง `oauth_providers`
```sql
CREATE TABLE IF NOT EXISTS oauth_providers (
  provider      TEXT PRIMARY KEY,          -- 'google' | 'facebook' | 'twitter' | 'tiktok'
  client_id     TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  active        INTEGER NOT NULL DEFAULT 0 -- 0 = ปิด, 1 = เปิด
);
```
- Seed 4 แถวอัตโนมัติเมื่อ server start (`INSERT OR IGNORE`)

#### คอลัมน์ใหม่ใน `installers`
```sql
ALTER TABLE installers ADD COLUMN oauth_provider TEXT;  -- 'google' | 'facebook' | ...
ALTER TABLE installers ADD COLUMN oauth_id TEXT;         -- provider's user ID
```
- OAuth users มี `password_hash = ''` — login ผ่าน Social เท่านั้น (เว้นแต่ตั้งรหัสผ่านทีหลัง)

---

### 15.6 — API Endpoints ใหม่

```
GET  /api/auth/providers                  — provider list ที่ active (สาธารณะ — ไม่ต้อง auth)
GET  /api/auth/google                     — redirect → Google OAuth
GET  /api/auth/google/callback            — Google callback → JWT → redirect login page
GET  /api/auth/facebook                   — redirect → Facebook OAuth
GET  /api/auth/facebook/callback          — Facebook callback
GET  /api/auth/twitter                    — redirect → X/Twitter OAuth 2.0 PKCE
GET  /api/auth/twitter/callback           — X/Twitter callback
GET  /api/auth/tiktok                     — redirect → TikTok OAuth
GET  /api/auth/tiktok/callback            — TikTok callback
GET  /api/admin/oauth-providers           — ดู config ทั้งหมด (Admin JWT)
PUT  /api/admin/oauth-providers/:provider — อัปเดต client_id, client_secret, active (Admin JWT)
```

---

### 15.7 — วิธีตั้งค่า (Setup Guide)

1. **สมัคร Developer App** กับแต่ละ platform:
   | Platform | Developer Portal | Redirect URI |
   |----------|-----------------|-------------|
   | Google | console.cloud.google.com → OAuth 2.0 Client ID | `http://localhost:3000/api/auth/google/callback` |
   | Facebook | developers.facebook.com → Facebook Login | `http://localhost:3000/api/auth/facebook/callback` |
   | X/Twitter | developer.twitter.com → OAuth 2.0 (Web App) | `http://localhost:3000/api/auth/twitter/callback` |
   | TikTok | developers.tiktok.com → Login Kit | `http://localhost:3000/api/auth/tiktok/callback` |

2. **เข้า Admin Panel → 🔑 Social Auth**
3. กรอก Client ID + Secret ของแต่ละ provider
4. Toggle เปิดใช้งาน → กด บันทึก
5. ปุ่ม Social Login จะปรากฎบนหน้า login.html อัตโนมัติ

---

### ไฟล์ที่สร้าง/แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `forgot-password.html` | **สร้างใหม่** — ฟอร์มขอ reset link, anti-enumeration, dynamic logo |
| `reset-password.html` | **สร้างใหม่** — ตั้งรหัสผ่านใหม่ด้วย `?token=`, auto-redirect |
| `login.html` | เพิ่ม Social buttons (4 ช่องทาง, hidden by default) + OAuth callback handler + fetch active providers |
| `register.html` | เพิ่ม dynamic logo โหลดจาก `/api/content` |
| `index.html` | installer cards ที่ไม่มีโลโก้ใช้ site logo แบบ grayscale (Promise.all pattern) |
| `styles.css` | เพิ่ม `.social-divider`, `.social-buttons`, `.social-btn`, `.social-btn--{provider}` (4 brand variants) + `.oauth-toggle` (toggle switch CSS) |
| `admin.html` | เพิ่มเมนู 🔑 Social Auth + แท็บ `tab-social-auth` + JS functions (loadOAuthProviders, saveOAuthProvider, toggleOAuthSecret) |
| `backend/node/server.js` | เพิ่มตาราง `oauth_providers`; seed 4 rows; `getOAuthCreds()`; 8 OAuth routes; `findOrCreateOAuthUser()`; `oauthSuccess()`/`oauthError()`; `GET /api/auth/providers`; admin CRUD routes; ลบ OAuth env var constants |
| `backend/node/.env.example` | เพิ่ม `BACKEND_URL` + OAuth credential template พร้อม redirect URI comments (ข้อมูล reference เท่านั้น — credentials จัดการจาก Admin Panel) |

---

## Phase 16A — Blog Content Import (40 Posts จาก xlsx)

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented** | วันที่: 2026-05-15

### วัตถุประสงค์
นำเข้าบทความทั้งหมด 40 รายการจากไฟล์ `Blog Content.xlsx` เข้าสู่ฐานข้อมูล `solarpanel.db` พร้อม categories, tags, meta keywords และวันที่สุ่ม

### ข้อมูลใน Excel (4 คอลัมน์)
| คอลัมน์ | รายละเอียด |
|---------|-----------|
| A: ลำดับ | 1–40 (row 31 มี annotation "ทำ ข้อ 11-40" แทนตัวเลข) |
| B: หัวข้อคอนเทนต์ | ชื่อบทความภาษาไทย |
| C: รายละเอียดเนื้อหาสำหรับ Blog | เนื้อหาประมาณ 300–400 คำ (plain text) |
| D: สรุปสำหรับ Social Media | Caption สำหรับ social (ไม่ได้ import ลง DB) |

### Categories ที่ใช้ (7 หมวด)
| หมวด | จำนวน |
|------|-------|
| ความรู้ทั่วไป | 18 |
| คู่มือ | 10 |
| การเงิน | 8 |
| การดูแลรักษา | 7 |
| สิ่งแวดล้อม | 3 |
| กฎหมายและข้อบังคับ | 3 |
| ธุรกิจ | 1 |

### Metadata ที่ generate อัตโนมัติ
| Field | Logic |
|-------|-------|
| `slug` | กำหนดตาม `SLUG_MAP` (English slug เช่น `solar-investment-worth-it-2026`) |
| `excerpt` | 200 ตัวอักษรแรกของ body + `…` |
| `content` | `<h2>ชื่อเรื่อง</h2>` + body แปลงเป็น HTML `<p>` tags (split ที่ ~200 ตัว) |
| `meta_title` | `{ชื่อบทความ} \| Solar Panel Thailand` |
| `meta_description` | 155 ตัวอักษรแรกของ body + `…` |
| `tags` | JSON array กำหนดตาม `TAGS_MAP` (2–4 keywords ต่อบทความ) |
| `author` | `ทีมงาน Solar Panel Thailand` |
| `published_at` | วันที่สุ่มระหว่าง 2025-01-01 ถึง 2026-05-01 |
| `status` | `active` |

### ผลลัพธ์
- **รวมบทความในฐานข้อมูล: 50 รายการ** (10 seed เดิม + 40 ใหม่จาก xlsx)
- ใช้ `INSERT OR IGNORE` — ป้องกัน duplicate บน `slug` UNIQUE constraint

### Script ที่สร้าง
| ไฟล์ | สถานะ | หมายเหตุ |
|------|-------|---------|
| `backend/node/seed-blog-content.js` | เก็บไว้ (reuse ได้) | อ่าน xlsx → INSERT OR IGNORE ทุก post |

### ปัญหาที่พบและแก้ไข
| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| npm ติดตั้งไม่ได้ | SSL cert ใน corporate network | `npm install xlsx --legacy-peer-deps --no-strict-ssl` |
| Row 31 ถูกข้าม | cell A ใน Excel เป็น "ทำ ข้อ 11-40" แทน "31" ทำให้ `parseInt()` return `NaN` | สร้าง `fix-row31.js` insert ด้วยมือ (ลบหลังใช้งาน) |

---

## Phase 16B — Bug Fixes & Slider CAPTCHA Anti-spam

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented** | วันที่: 2026-05-15

### 16B.1 — Fix: Leaflet Map ทับ Sticky Navbar

**อาการ:** แผนที่ Leaflet บนหน้า `installer-detail.html` ลอยทับ navbar เมื่อ scroll

**สาเหตุ:** Leaflet สร้าง elements ที่มี z-index 200–800 ตามค่า default ของ Leaflet CSS ขณะที่ `.site-header` มี `z-index: 100`

**แก้ไข:**
| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `styles.css` | `.site-header` z-index: `100` → `1100` (สูงกว่า Leaflet สูงสุดที่ 800) |

---

### 16B.2 — Fix: ปุ่ม "เขียนรีวิว" ไม่ทำงาน

**อาการ:** กดปุ่ม "✏️ เขียนรีวิว" แล้ว modal ไม่เปิด ไม่มี action ใดเกิดขึ้น

**สาเหตุ:** `openReviewModal()` พยายาม `document.getElementById('revTitle').value = ''` แต่ modal HTML ไม่มี element ที่มี id `revTitle` → JavaScript throw `TypeError: Cannot set properties of null` ก่อนถึงบรรทัด `reviewModal.classList.add('open')`

**แก้ไข:**
| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `installer-detail.html` | ลบ `document.getElementById('revTitle').value = '';` ออกจาก `openReviewModal()` |

---

### 16B.3 — Feature: Slider CAPTCHA ก่อนส่งรีวิว

**วัตถุประสงค์:** ป้องกันรีวิวปลอมจาก bot โดยไม่ต้องพึ่ง third-party service

**Flow:**
```
กด "ส่งรีวิว"
  → validate (rating + ชื่อ + อีเมล + รายละเอียด ≥ 20 ตัว)
  → openCaptcha(callback)     ← เปิด CAPTCHA modal
    ลากแถบไปทางขวาสุด
    → confirmCaptcha()         ← เลือกถึง threshold
      แถบเปลี่ยนเป็นสีเขียว
      หลัง 650ms → closeCaptcha() + doSubmitReview(...)
  → POST /api/reviews
```

**HTML เพิ่ม:**
```html
<!-- Slider CAPTCHA Modal -->
<div class="modal-overlay" id="captchaModal">
  <div class="modal-box" style="max-width:400px;text-align:center">
    <h3 class="modal-title">🔒 ยืนยันตัวตน</h3>
    <p>เลื่อนแถบไปทางขวาสุดเพื่อยืนยันว่าคุณไม่ใช่บอต</p>
    <div class="captcha-track" id="captchaTrack">
      <div class="captcha-fill" id="captchaFill"></div>
      <div class="captcha-track-label" id="captchaTrackLabel">เลื่อนเพื่อยืนยัน ›</div>
      <div class="captcha-handle" id="captchaHandle">›</div>
    </div>
    <p class="captcha-hint" id="captchaHint"></p>
  </div>
</div>
```

**CSS classes:**
| Class | บทบาท |
|-------|-------|
| `.captcha-track` | container slider — `height: 52px`, `border-radius: 26px`, `overflow: hidden` |
| `.captcha-fill` | แถบสีเขียว (gradient) เติมตามตำแหน่ง handle |
| `.captcha-handle` | ปุ่มลาก — วงกลม 46px, `cursor: grab` |
| `.captcha-handle.verified` | handle สีเขียว + "✓" |
| `.captcha-track.verified` | fill เปลี่ยนเป็น `#00b8a0 → #00d4b8` |

**JS Functions:**
| Function | บทบาท |
|----------|-------|
| `openCaptcha(onSuccess)` | reset UI + bind mouse/touch events + แสดง modal |
| `closeCaptcha()` | ซ่อน modal + unbind events |
| `moveCaptcha(clientX)` | คำนวณตำแหน่ง + อัปเดต fill width + check threshold |
| `confirmCaptcha()` | snap to end + animate สีเขียว + delay 650ms → callback |
| `snapCaptchaBack()` | animate กลับ left=3px ถ้าปล่อยก่อนถึงปลาย |
| `submitReview()` | validate → `openCaptcha(() => doSubmitReview(...))` |
| `doSubmitReview(body, name, email, date)` | POST /api/reviews (แยกออกจาก validate) |

**ไฟล์ที่แก้ไข:**
| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `installer-detail.html` | เพิ่ม CSS (`.captcha-*`), HTML modal CAPTCHA, แยก `submitReview()` → validate + `openCaptcha()`, เพิ่ม `doSubmitReview()`, เพิ่ม CAPTCHA JS functions ทั้งหมด |

---

## Phase 17 — YouTube / TikTok / Facebook / Website URL สำหรับผู้ติดตั้ง

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented (2026-05-18)**

### วัตถุประสงค์
ให้ผู้ติดตั้งกรอก URL ของ Social Media และเว็บไซต์บริษัทในหน้า Dashboard ของตัวเอง แล้วให้แสดงผลบนหน้า installer-detail.html โดยอัตโนมัติ รวมถึง Admin สามารถกรอก YouTube URL ผ่าน Admin Panel ได้ด้วย

### ฟีเจอร์ที่เพิ่ม

| ช่อง | Dashboard | Admin Panel | installer-detail แสดง |
|------|-----------|-------------|----------------------|
| YouTube URL | ✅ | ✅ | ✅ embed วิดีโอ responsive |
| Facebook URL | ✅ | — | ✅ sidebar row + link |
| TikTok URL | ✅ | — | ✅ sidebar row + link |
| Website URL | ✅ | — | ✅ sidebar row + link |

### Database Migration

```js
// server.js — migration block (ทำงานอัตโนมัติทุก server start)
addCol('installers', 'youtube_url',  'TEXT');
addCol('installers', 'tiktok_url',   'TEXT');
addCol('installers', 'facebook_url', 'TEXT');
addCol('installers', 'website_url',  'TEXT');
```

### API Changes

**`GET /api/installers/:id`** (public) — เพิ่ม field ใน SELECT:
```sql
youtube_url, tiktok_url, facebook_url, website_url
```

**`GET /api/installer/me`** (installerAuth) — เพิ่ม field ใน SELECT:
```sql
youtube_url, tiktok_url, facebook_url, website_url
```

**`PUT /api/installer/me`** (installerAuth) — รับ 4 fields ใหม่:
```js
// destructure จาก req.body
const { ..., youtube_url, tiktok_url, facebook_url, website_url } = req.body;
// SQL: youtube_url=?, tiktok_url=?, facebook_url=?, website_url=?
// params: url ? url.trim() : null  (trim เท่านั้น, ไม่ strip HTML)
```

**`PUT /api/admin/installers/:id`** (adminAuth) — รับ `youtube_url` เท่านั้น (Admin Panel มีเฉพาะ YouTube):
```js
const { ..., youtube_url } = req.body;
// SQL: youtube_url=?
```

### Dashboard (dashboard.html)

**HTML fields เพิ่ม** (อยู่ใต้ Social section):
```html
<div class="form-group">
  <label for="p-website">เว็บไซต์บริษัท</label>
  <input type="url" id="p-website" name="website_url"
    placeholder="https://www.yourcompany.com" maxlength="200" />
</div>
<div class="form-row">
  <div class="form-group">
    <label for="p-facebook">Facebook</label>
    <input type="url" id="p-facebook" name="facebook_url"
      placeholder="https://www.facebook.com/yourpage" maxlength="200" />
  </div>
  <div class="form-group">
    <label for="p-tiktok">TikTok</label>
    <input type="url" id="p-tiktok" name="tiktok_url"
      placeholder="https://www.tiktok.com/@yourpage" maxlength="200" />
  </div>
</div>
<div class="form-group">
  <label for="p-youtube">YouTube</label>
  <input type="url" id="p-youtube" name="youtube_url"
    placeholder="https://www.youtube.com/watch?v=..." maxlength="200" />
</div>
```

**JS Load (ใน profile fetch callback):**
```js
document.getElementById('p-website').value  = u.website_url  || '';
document.getElementById('p-facebook').value = u.facebook_url || '';
document.getElementById('p-tiktok').value   = u.tiktok_url   || '';
document.getElementById('p-youtube').value  = u.youtube_url  || '';
```

**JS Save body:**
```js
website_url:  document.getElementById('p-website').value.trim()  || null,
facebook_url: document.getElementById('p-facebook').value.trim() || null,
tiktok_url:   document.getElementById('p-tiktok').value.trim()   || null,
youtube_url:  document.getElementById('p-youtube').value.trim()  || null,
```

### Admin Panel (admin.html)

**HTML field เพิ่ม** (ใน inst-modal, ใต้ warranty section):
```html
<div class="admin-form-group">
  <label>URL วิดีโอ YouTube</label>
  <input type="url" id="inst-m-youtube" placeholder="https://www.youtube.com/watch?v=..." />
</div>
```

**JS Load:** `document.getElementById('inst-m-youtube').value = full.youtube_url || '';`  
**JS Save:** `youtube_url: document.getElementById('inst-m-youtube').value.trim() || null`

### installer-detail.html

**CSS — YouTube embed responsive:**
```css
.yt-wrap { position:relative; padding-bottom:56.25%; height:0; border-radius:12px; overflow:hidden; background:#000; }
.yt-wrap iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
```

**HTML — YouTube card** (เพิ่มก่อน portfolio section):
```html
<div class="section-card" id="youtubeCard" style="display:none">
  <h2 class="sec-title">▶ วิดีโอแนะนำ</h2>
  <div class="yt-wrap">
    <iframe id="youtubeFrame" allowfullscreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
    </iframe>
  </div>
</div>
```

**HTML — sidebar rows** (เพิ่มหลัง LINE row ใน contact card):
```html
<div class="c-row" id="websiteRow" style="display:none">
  <div class="c-icon">🌐</div>
  <div><div class="c-lbl">เว็บไซต์</div>
    <a class="c-val" id="websiteLink" href="#" target="_blank" rel="noopener"
       style="color:var(--primary);text-decoration:none"></a>
  </div>
</div>
<div class="c-row" id="facebookRow" style="display:none">
  <div class="c-icon">📘</div>
  <div><div class="c-lbl">Facebook</div>
    <a class="c-val" id="facebookLink" href="#" target="_blank" rel="noopener"
       style="color:var(--primary);text-decoration:none"></a>
  </div>
</div>
<div class="c-row" id="tiktokRow" style="display:none">
  <div class="c-icon">🎵</div>
  <div><div class="c-lbl">TikTok</div>
    <a class="c-val" id="tiktokLink" href="#" target="_blank" rel="noopener"
       style="color:var(--primary);text-decoration:none"></a>
  </div>
</div>
```

**JS — `renderYoutube(url)` function:**
```js
function renderYoutube(url) {
  if (!url) return;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v') || u.pathname.split('/').pop();
    }
  } catch { return; }
  if (!videoId) return;
  document.getElementById('youtubeFrame').src = `https://www.youtube.com/embed/${videoId}`;
  document.getElementById('youtubeCard').style.display = '';
}
```
รองรับทั้ง `youtube.com/watch?v=ID` และ `youtu.be/ID`

**JS — social links render** (หลัง `lineBtn` setup):
```js
if (d.website_url) {
  const el = document.getElementById('websiteLink');
  el.href = d.website_url;
  el.textContent = d.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  document.getElementById('websiteRow').style.display = '';
}
if (d.facebook_url) {
  const el = document.getElementById('facebookLink');
  el.href = d.facebook_url;
  el.textContent = d.facebook_url
    .replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '') || 'Facebook';
  document.getElementById('facebookRow').style.display = '';
}
if (d.tiktok_url) {
  const el = document.getElementById('tiktokLink');
  el.href = d.tiktok_url;
  el.textContent = d.tiktok_url
    .replace(/^https?:\/\/(www\.)?tiktok\.com\//, '').replace(/\/$/, '') || 'TikTok';
  document.getElementById('tiktokRow').style.display = '';
}
```

**JS — เรียก `renderYoutube`** พร้อมกับ `fetchPortfolio` และ `initMap`:
```js
renderYoutube(d.youtube_url);
```

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | migration 4 columns, เพิ่ม fields ใน GET /api/installers/:id, GET /api/installer/me, PUT /api/installer/me (4 fields), PUT /api/admin/installers/:id (youtube_url) |
| `dashboard.html` | เพิ่ม 4 input fields (website เต็มแถว, facebook+tiktok คู่, youtube), load/save logic |
| `admin.html` | เพิ่ม YouTube URL input ใน inst-modal, load/save logic |
| `installer-detail.html` | CSS `.yt-wrap`, HTML youtube card + 3 sidebar rows, JS `renderYoutube()` + social render logic |
| `calculator.html` | แก้ CTA button link จาก `index.html#directory` → `installers.html` |

---

## Phase 18 — Email Templates Tab ใน Admin + Site Logo ใน Email

> Priority: **Medium** | Effort: **S** | สถานะ: **✅ Implemented**

### ภาพรวม

Phase นี้มี 2 ส่วน:
1. **Email Templates Tab** — เพิ่มเมนูใน Admin Panel เพื่อแสดงรายการอีเมลทั้งหมดที่ระบบส่ง พร้อมสถานะ logo และ SMTP
2. **Site Logo ใน Email** — ทุกอีเมลที่ส่งออกจากระบบจะแสดง logo จาก Settings โดยอัตโนมัติ

---

### อีเมลทั้งหมดในระบบ (10 ประเภท)

| # | ชื่อ | ผู้รับ | Trigger |
|---|------|--------|---------|
| 1 | ยืนยันการลงทะเบียน | ผู้ติดตั้งใหม่ | สมัครบัญชีสำเร็จ |
| 2 | แจ้งอนุมัติบัญชี | ผู้ติดตั้ง | Admin อนุมัติบัญชี |
| 3 | แจ้งปฏิเสธบัญชี | ผู้ติดตั้ง | Admin ปฏิเสธบัญชี |
| 4 | Reset Password | ผู้ติดตั้ง | ขอลิงก์ตั้งรหัสผ่านใหม่ |
| 5 | Lead ใหม่ — ผู้ติดตั้ง | ผู้ติดตั้ง | มีคนส่งฟอร์มติดต่อ |
| 6 | Lead ใหม่ — Admin | Admin | มีคนส่งฟอร์มติดต่อ |
| 7 | รีวิวใหม่รอตรวจสอบ | Admin | ลูกค้าส่งรีวิวใหม่ |
| 8 | รีวิวได้รับการอนุมัติ | ผู้ติดตั้ง | Admin อนุมัติรีวิว |
| 9 | ข้อความ Support ใหม่ | Admin | ลูกค้าส่งข้อความติดต่อ |
| 10 | ตอบกลับ Support | ลูกค้า | Admin ตอบกลับข้อความ |

---

### Site Logo ใน Email — server.js

#### `getSiteLogoUrl()` — helper ดึง logo จาก DB

เพิ่ม function ใหม่ก่อน `emailLayout()`:

```js
function getSiteLogoUrl() {
  try {
    const row = db.prepare("SELECT value FROM site_content WHERE key='logo_url'").get();
    return (row && row.value) ? row.value : null;
  } catch { return null; }
}
```

- ใช้ better-sqlite3 ซึ่งเป็น synchronous — ไม่ต้องใช้ async/await
- คืนค่า relative path เช่น `/uploads/site/logo.jpg` หรือ `null` ถ้าไม่มี

#### `emailLayout()` — ปรับให้ใช้ logo จาก Settings

```js
function emailLayout(title, bodyHtml) {
  const logoPath = getSiteLogoUrl();
  const logoHtml = logoPath
    ? `<img src="${BACKEND_URL}${logoPath}" alt="Solar Panel Thailand"
         style="max-height:48px;max-width:180px;object-fit:contain;display:block;margin-bottom:8px">`
    : `<div style="color:#fff;font-size:1.1rem;font-weight:700">&#9728;&#65039; Solar Panel Thailand</div>`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f9f8;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#00b8a0,#00d4b8);padding:24px 32px">
    ${logoHtml}
    <div style="color:rgba(255,255,255,0.9);font-size:0.875rem;font-weight:600">${escHtml(title)}</div>
  </div>
  <div style="padding:28px 32px;color:#0f2428;font-size:0.93rem;line-height:1.7">${bodyHtml}</div>
  <div style="padding:14px 32px;background:#f8fffe;border-top:1px solid #e0efed;font-size:0.78rem;color:#6b7c7a;text-align:center">
    &copy; 2026 Solar Panel Thailand
  </div>
</div></body></html>`;
}
```

- `BACKEND_URL` (default `http://localhost:3000`) ใช้ prefix กับ relative path เพื่อให้ email client โหลดรูปได้
- ถ้าไม่มี logo จะแสดง text แทน
- การแก้ไขจุดเดียวนี้ครอบคลุมทุกอีเมลที่เรียก `emailLayout()` (8 จาก 10 ประเภท)

> **หมายเหตุ:** อีเมล "แจ้งอนุมัติบัญชี" และ "Reset Password" ใช้ raw HTML string ตรง (ไม่ผ่าน `emailLayout()`) จึงไม่ได้รับ logo อัตโนมัติจาก Phase นี้

---

### Email Templates Tab — admin.html

#### Nav link (เพิ่มในแถบ sidebar)

```html
<a class="admin-nav-link" data-tab="email-templates">
  <span>✉️</span><span class="nav-label">Email Templates</span>
</a>
```

วางระหว่าง ⚙️ Settings และ 🔑 Social Auth

#### Tab dispatcher

```js
if (tab === 'email-templates') loadEmailTemplatesTab();
```

เพิ่มใน `loadTab()` switch/if block

#### HTML — `<section id="tab-email-templates">`

ประกอบด้วย 3 ส่วน:

1. **Logo status banner** — แสดง preview logo (ถ้ามี) หรือ warning พร้อม link ไป Settings (ถ้าไม่มี)
2. **Grid 10 อีเมล** — แต่ละ card แสดง: icon, ชื่อ, ผู้รับ, subject, trigger
3. **SMTP status card** — แสดงว่า SMTP ตั้งค่าแล้วหรือยัง และ email ที่ส่งจาก

#### JS — `loadEmailTemplatesTab()`

```js
async function loadEmailTemplatesTab() {
  try {
    const res  = await fetch(`${API}/api/admin/content`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.success) return;

    const content = {};
    (data.data || []).forEach(r => { content[r.key] = r.value; });

    const logoUrl  = content['logo_url'] || '';
    const smtpUser = content['smtp_user'] || '';
    const logoNote = document.getElementById('email-tpl-logo-note');
    const noLogo   = document.getElementById('email-tpl-nologo-note');
    const smtpEl   = document.getElementById('email-tpl-smtp-status');

    if (logoUrl) {
      const full = logoUrl.startsWith('http') ? logoUrl : `${API}${logoUrl}`;
      document.getElementById('email-tpl-logo-preview').innerHTML =
        `<img src="${full}" alt="logo" style="max-width:76px;max-height:36px;object-fit:contain">`;
      logoNote.style.display = 'flex';
      noLogo.style.display   = 'none';
    } else {
      logoNote.style.display = 'none';
      noLogo.style.display   = '';
    }

    if (smtpUser) {
      smtpEl.innerHTML = `<span style="color:#059669;font-weight:600">✓ SMTP ตั้งค่าแล้ว</span>
        — ส่งจาก <strong>${esc(smtpUser)}</strong>`;
    } else {
      smtpEl.innerHTML = `<span style="color:#dc2626;font-weight:600">✗ ยังไม่ได้ตั้งค่า SMTP</span>
        — อีเมลจะ<strong>ไม่ถูกส่ง</strong>`;
    }
  } catch { /* silent */ }
}
```

> API `GET /api/admin/content` คืนค่า `{ success: true, data: [{key, value}] }` — ต้อง iterate จาก `data.data` ไม่ใช่ `data.content`

---

### ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `backend/node/server.js` | เพิ่ม `getSiteLogoUrl()`, แก้ `emailLayout()` ให้แสดง logo จาก site_content |
| `admin.html` | เพิ่ม nav link ✉️ Email Templates, section `#tab-email-templates` (logo banner + 10 email cards + SMTP status), function `loadEmailTemplatesTab()` |

---

## Phase 19 — Admin: ส่งมอบบัญชี + แก้ไขผู้ติดตั้งแบบเต็ม + แก้ Service Area + Dynamic Favicon

> Priority: **High** | Effort: **M** | สถานะ: **✅ Implemented**  
> **หมายเหตุ:** Phase นี้เป็น Phase แรกที่ทำบนโค้ด **Next.js** (หลัง migration N1–N9) — ต่างจาก Phase 1–18 ที่อ้างอิง `backend/node/server.js` + `*.html` (Vanilla) ไฟล์ที่กล่าวถึงด้านล่างทั้งหมดอยู่ใต้ `frontend/`

### ภาพรวม

Phase นี้มี 4 ส่วนหลัก ทั้งหมดอยู่ใน Admin Panel (ยกเว้น 19D ที่กระทบทั้งเว็บ):

1. **19A — ส่งมอบบัญชี (Claim Account)**: Admin เปลี่ยนอีเมล login ของผู้ติดตั้งเป็นอีเมลเจ้าของจริง พร้อมส่งรหัสผ่านชั่วคราวทางอีเมล และบังคับให้เปลี่ยนรหัสผ่านตอน login ครั้งแรก
2. **19B — หน้าแก้ไขผู้ติดตั้งแบบเต็ม**: เพิ่มหน้า `/admin/installers/:id` ที่ไม่เคยมีมาก่อน (เดิมมีแค่ API แต่ไม่มี UI เรียกใช้จริง)
3. **19C — แก้ Service Area ไม่สอดคล้อง**: `service_provinces` กลายเป็นตัวขับเคลื่อนการค้นหา/filter บน `/installers` จริง (เดิมค้นหาจาก `location` เท่านั้น) + แก้บั๊ก services/certifications ไม่แสดงผลบนหน้า detail สำหรับผู้ติดตั้งที่ import ข้อมูลแบบ plain text (~150/164 ราย)
4. **19D — Favicon แบบ Dynamic**: favicon ทั้งเว็บอ่านจากโลโก้ที่ตั้งใน Admin → Content แทนไอคอน default ของ Next.js

---

### 19A — ส่งมอบบัญชีผู้ติดตั้ง (Claim Account)

**Flow:**
```
Admin กดปุ่ม "ส่งมอบบัญชี" ที่แถวผู้ติดตั้ง (แท็บ "ผู้ติดตั้ง")
  → Modal ให้กรอกอีเมลใหม่ (แทนอีเมล login เดิม)
  → กด "ส่งข้อมูลเข้าสู่ระบบ"
    → validate อีเมล + เช็คว่าไม่ซ้ำกับผู้ติดตั้งรายอื่น
    → สร้างรหัสผ่านชั่วคราวแบบสุ่ม (10 ตัวอักษร, ตัดตัวอักษรกำกวมออก)
    → UPDATE installers SET email=?, password_hash=?, must_change_password=1, claimed_at=NOW()
    → ส่งอีเมลแจ้งอีเมล login + รหัสผ่านชั่วคราวไปยังเจ้าของใหม่ (ไม่บล็อก UI ถ้าส่งไม่สำเร็จ)
  → แถวผู้ติดตั้งเปลี่ยน badge เป็น "✓ ส่งมอบแล้ว" (พร้อมวันที่ล่าสุดตอน hover)
  → กดส่งมอบซ้ำได้เสมอแม้ส่งไปแล้ว (re-send เปลี่ยนอีเมล/รหัสผ่านใหม่ทุกครั้ง)

เจ้าของใหม่ login ด้วยอีเมล + รหัสผ่านชั่วคราว
  → Dashboard เช็ค must_change_password → ถ้า = 1 บล็อกหน้าทั้งหมด แสดง gate "ตั้งรหัสผ่านใหม่"
  → กรอกรหัสผ่านชั่วคราว (เป็น current password) + รหัสผ่านใหม่ 2 ครั้ง
  → PUT /api/installer/password → เปลี่ยนรหัสผ่าน + เคลียร์ must_change_password=0
  → เข้า Dashboard ปกติ
```

**DB Migration** (`lib/db.ts` — รันอัตโนมัติทุกครั้งที่ start server ผ่าน `PRAGMA table_info` + `ALTER TABLE` แบบ idempotent):
```sql
ALTER TABLE installers ADD COLUMN must_change_password INTEGER DEFAULT 0;
ALTER TABLE installers ADD COLUMN claimed_at DATETIME;
```

**API Endpoint ใหม่:**
```
PUT /api/admin/installers/:id/claim
Body: { "email": "owner@example.com" }
→ { success: true, message: "ส่งข้อมูลเข้าสู่ระบบไปที่ owner@example.com แล้ว" }
```

**Email ใหม่:** `buildClaimAccountEmail(name, email, tempPassword, loginUrl)` ใน `lib/email.ts` — แสดงอีเมล login + รหัสผ่านชั่วคราวในตาราง + ปุ่มเข้าสู่ระบบ + คำเตือนว่าต้องเปลี่ยนรหัสผ่านตอน login ครั้งแรก

**บั๊กที่แก้ระหว่างทำ:** ฟอร์มเปลี่ยนรหัสผ่านใน Dashboard (`/dashboard` แท็บตั้งค่า) ส่ง field เป็น `currentPassword`/`newPassword` (camelCase) แต่ API `/api/installer/password` เดิมรับแค่ `current_password`/`new_password` (snake_case) — แปลว่าฟีเจอร์เปลี่ยนรหัสผ่านด้วยตัวเองพังอยู่ก่อนแล้ว (เงียบๆ) แก้ให้ endpoint รับได้ทั้งสองแบบ

---

### 19B — หน้าแก้ไขผู้ติดตั้งแบบเต็ม

`/admin/installers/:id` (Server Component ตรวจสิทธิ์ admin + `notFound()` ถ้าไม่พบ) + `EditInstallerClient.tsx` แก้ไขได้ครบทุกกลุ่ม:

| กลุ่ม | ฟิลด์ |
|-------|-------|
| ข้อมูลทั่วไป | name, email, phone, contact_email, line_id, response_time, พื้นที่ให้บริการ (ดู 19C), description, about |
| รูปภาพ | logo_url, card_image, banner_image (อัปโหลดไฟล์หรือวาง URL — ใช้ `ImageUrlOrFileField` ร่วมกับหน้าแก้ไขบทความ, subdir `installers`) |
| สถิติบริษัท | experience, founded_year, rating, reviews_count, total_projects, total_kw, satisfaction_rate |
| การรับประกัน | warranty_panel, warranty_inverter, warranty_workmanship |
| บริการ/ใบรับรอง/โครงการ | services, certifications (บรรทัดละ 1 รายการ), projects (รูปแบบ `ชื่อ \| ผลประหยัด`) |
| Social & เว็บไซต์ | youtube_url, tiktok_url, facebook_url, website_url |
| Featured | is_featured, featured_from, featured_until |

**API `PUT /api/admin/installers/:id`** เขียนใหม่ทั้งหมดให้ **merge-safe** — ดึงข้อมูลเดิมมาก่อน แล้วเขียนทับเฉพาะ field ที่ส่งมาจริง (เดิมเป็น blind overwrite ทุก field ด้วย `null`/default ถ้าไม่ส่งมา ซึ่งไม่เคยมีใครเรียกใช้จริงมาก่อนจึงไม่เคยพังให้เห็น) เพิ่ม `GET /api/admin/installers/:id` สำหรับหน้า Edit โหลดข้อมูลเต็ม

**บั๊กที่แก้ระหว่างทำ:**
- เช็คอีเมลซ้ำ (`WHERE email=? AND id!=?`) เดิมจะ error ทุกครั้งที่บันทึกโดยไม่เปลี่ยนอีเมล เพราะผู้ติดตั้งจำนวนมากใช้อีเมล seed ร่วมกัน (`support@solarthani.com`) — แก้ให้เช็คเฉพาะตอนอีเมลเปลี่ยนจริง
- ข้อมูลจริงในฐานข้อมูล (164 ผู้ติดตั้ง) ส่วนใหญ่เก็บ `services`/`certifications`/`service_provinces` เป็น**ข้อความธรรมดา** ไม่ใช่ JSON array (มีแค่ 13–14 รายที่เป็น seed เดิมที่เป็น JSON) — ฟอร์ม Edit เดิมจะ parse JSON ไม่ผ่านแล้ว**เงียบๆ แสดงค่าว่าง** ถ้า Admin กด Save จะเขียนทับข้อมูลจริงด้วยค่าว่างทันที แก้ให้แสดงข้อความดิบตามจริงแทนการทิ้งข้อมูล (ตรวจสอบแล้วว่าไม่มีข้อมูลจริงถูกเขียนทับระหว่างที่บั๊กนี้ยังอยู่)

---

### 19C — แก้ความไม่สอดคล้องของพื้นที่ให้บริการ (location vs service_provinces)

**ปัญหาที่พบ:** `/installers` (dropdown จังหวัด + filter) อ่านจาก `location` (ข้อความอิสระ) เท่านั้น ผ่านการ regex แกะชื่อจังหวัด ส่วน `service_provinces` (ที่ Dashboard ของช่างและหน้า Admin Edit แก้ไข) ไม่มีผลต่อการค้นหาเลย

**วิธีแก้** (`app/installers/InstallersClient.tsx`): `service_provinces` เป็นตัวขับเคลื่อน dropdown + filter หลัก โดย fallback ไปแกะจาก `location` เฉพาะกรณีที่ installer ยังไม่เคยตั้ง `service_provinces` — รองรับทั้ง 2 รูปแบบข้อมูลจริงที่พบในฐานข้อมูล (JSON array ของ seed เดิม และข้อความ comma-separated ของข้อมูล import) พร้อมกรองคำที่ไม่ใช่ชื่อจังหวัดจริง (เช่น "และทั่วประเทศ", "(ภาคใต้)") ไม่ให้หลุดเข้า dropdown

**รวม 2 ฟิลด์เป็นฟิลด์เดียวในหน้า Admin Edit** (กันความสับสน — เดิมมี "พื้นที่ (แสดงในการ์ด)" กับ "พื้นที่ให้บริการ" แยกกัน 2 ช่อง ที่แก้ไขอิสระต่อกันจนขัดแย้งกันได้): เหลือช่องเดียว **"พื้นที่ให้บริการ (คั่นด้วยจุลภาค)"** — ตอนบันทึกจะเซ็ต `location` และ `service_provinces` เป็นค่าเดียวกันเสมอ เหมือนที่ Dashboard ของช่างทำอยู่แล้ว

**แก้บั๊กหน้า detail ผู้ติดตั้งด้วย** (`app/installers/[id]/page.tsx`): section "บริการของเรา" / "ใบรับรองและมาตรฐาน" หายไปทั้ง section สำหรับผู้ติดตั้งที่เก็บ `services`/`certifications` เป็นข้อความธรรมดา (บั๊กเดิมที่มีอยู่ก่อน ไม่เกี่ยวกับ 19A/19B) เพราะ `JSON.parse` ล้มเหลวแล้วคืนค่า `[]` เงียบๆ — เพิ่ม `parseListField()` รองรับทั้ง JSON array และข้อความธรรมดา (แยกด้วยขึ้นบรรทัดใหม่ + จุลภาค)

**ผลข้างเคียงที่ดี:** เมื่อ Admin เปิดแก้ผู้ติดตั้งรายที่เก็บข้อมูลแบบข้อความธรรมดาแล้วกด Save ข้อมูลจะถูกแปลงเป็น JSON array ให้อัตโนมัติ — ค่อยๆ "อัปเกรด" รูปแบบข้อมูลทั้งฐานไปเรื่อยๆ โดยไม่ต้องรัน migration ทีเดียวทั้งตาราง

---

### 19D — Favicon แบบ Dynamic จากโลโก้เว็บ

**ปัญหา:** favicon เดิมเป็นไอคอน default ของ Next.js (`app/favicon.ico`) และมี `<link rel="icon">` ซ้อนกัน 2 อันเมื่อพยายามตั้งค่า favicon แบบ dynamic ทำให้เบราว์เซอร์แสดงไอคอนเดิมค้าง

**วิธีแก้** (`app/layout.tsx`):
- `generateMetadata()` อ่าน `site_content.logo_url` แล้วตั้ง `icons: { icon, shortcut, apple }` แบบ dynamic ทุก request — เปลี่ยนโลโก้ใน Admin → Content เมื่อไหร่ favicon เปลี่ยนตามทันทีโดยไม่ต้อง deploy ใหม่
- ย้าย `app/favicon.ico` → `public/favicon.ico` (ไฟล์ static เฉยๆ ไม่ auto-inject `<link>` แล้ว) ใช้เป็น fallback กรณีเว็บยังไม่ได้ตั้งโลโก้

> หมายเหตุ: เบราว์เซอร์ cache favicon นานมาก ต้อง hard refresh (Ctrl+Shift+R) หรือเปิดแท็บใหม่ถึงจะเห็นการเปลี่ยนแปลง

---

### ไฟล์ที่สร้าง/แก้ไข (Phase 19, ทั้งหมดใน `frontend/`)

| ไฟล์ | การเปลี่ยนแปลง |
|------|--------------|
| `lib/db.ts` | เพิ่ม `ensureSchema()` — migration `must_change_password`, `claimed_at` แบบ idempotent รันอัตโนมัติตอน start |
| `lib/auth.ts` | เพิ่ม `generateTempPassword()` |
| `lib/email.ts` | เพิ่ม `buildClaimAccountEmail()` |
| `types/index.ts` | เพิ่ม `must_change_password`, `claimed_at` ใน `Installer` interface |
| `app/api/admin/installers/[id]/claim/route.ts` | **ใหม่** — PUT ส่งมอบบัญชี |
| `app/api/admin/installers/[id]/route.ts` | เขียนใหม่ — เพิ่ม GET, ทำ PUT ให้ merge-safe รองรับทุก field, แก้บั๊กเช็คอีเมลซ้ำ |
| `app/api/installer/password/route.ts` | แก้รับ field ทั้ง camelCase/snake_case, เคลียร์ `must_change_password` เมื่อเปลี่ยนรหัสผ่านสำเร็จ |
| `app/api/installers/route.ts` | เพิ่ม `service_provinces` ใน SELECT + filter (endpoint นี้ frontend ยังไม่ได้เรียกใช้จริง แต่แก้ไว้กันบั๊กเดิมย้อนกลับมา) |
| `app/admin/page.tsx` | เพิ่ม `claimed_at` ใน SELECT installers |
| `app/admin/AdminClient.tsx` | เพิ่มปุ่ม/modal "ส่งมอบบัญชี" + badge สถานะ, ปุ่ม "✏️ แก้ไข" ลิงก์ไปหน้า Edit |
| `app/admin/BlogFormFields.tsx` | เพิ่ม `subdir` prop ให้ `ImageUrlOrFileField` (ใช้ร่วมกับ installer edit) |
| `app/admin/installers/[id]/page.tsx` | **ใหม่** — Server Component หน้าแก้ไขผู้ติดตั้ง |
| `app/admin/installers/[id]/EditInstallerClient.tsx` | **ใหม่** — ฟอร์มแก้ไขแบบเต็ม |
| `app/dashboard/DashboardClient.tsx` | เพิ่ม gate บังคับเปลี่ยนรหัสผ่านเมื่อ `must_change_password=1` |
| `app/installers/InstallersClient.tsx` | เปลี่ยน dropdown/filter จังหวัดให้อ่านจาก `service_provinces` เป็นหลัก (fallback `location`) |
| `app/installers/[id]/page.tsx` | เพิ่ม `parseListField()` แก้บั๊ก services/certifications ไม่แสดงผลสำหรับข้อมูล plain-text |
| `app/layout.tsx` | `generateMetadata()` อ่าน `logo_url` ตั้ง favicon แบบ dynamic |
| `app/favicon.ico` → `public/favicon.ico` | ย้ายไฟล์ กันชนกับ favicon แบบ dynamic |
