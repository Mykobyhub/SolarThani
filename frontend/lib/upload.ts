import fs from 'fs';
import path from 'path';

// บน VPS ตั้ง UPLOADS_DIR เป็น absolute path ไปยัง persistent disk/volume แยกจากโค้ด
// (เช่น /var/www/solarpanel/uploads) เพื่อไม่ให้ deploy/git pull กระทบไฟล์ที่อัปโหลดไว้
// ถ้าไม่ตั้งไว้ จะ fallback ไปที่ ../uploads (เดิม สำหรับ dev)
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), '..', 'uploads');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function saveFile(
  file: File,
  subdir: string,
  basename: string
): Promise<string> {
  const ext = path.extname(file.name).toLowerCase() || '.bin';
  const filename = `${basename}${ext}`;
  const dir = path.join(UPLOADS_ROOT, subdir);
  ensureDir(dir);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}

/** Same as saveFile() but for raw bytes (e.g. an image downloaded from the LINE Content API,
 * which arrives as a Buffer, not a browser-side File). */
export function saveBuffer(buffer: Buffer, subdir: string, basename: string, ext: string): string {
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  const filename = `${basename}${cleanExt}`;
  const dir = path.join(UPLOADS_ROOT, subdir);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}

export function deleteFile(urlPath: string): void {
  try {
    const rel = urlPath.replace(/^\/uploads\//, '');
    const full = path.join(UPLOADS_ROOT, rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {}
}
