import fs from 'fs';
import path from 'path';

export const UPLOADS_ROOT = path.join(process.cwd(), '..', 'uploads');

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

export function deleteFile(urlPath: string): void {
  try {
    const rel = urlPath.replace(/^\/uploads\//, '');
    const full = path.join(UPLOADS_ROOT, rel);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {}
}
