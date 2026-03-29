import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const UPLOADS_PUBLIC_PREFIX = '/uploads';

export type StoredUploadFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

export function ensureUploadsDir() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function buildStoredFilename(originalname: string) {
  const id = randomUUID();
  const extension = extname(originalname).toLowerCase();
  return {
    id,
    filename: `${id}${extension}`,
  };
}

export function buildUploadUrl(filename: string) {
  return `${UPLOADS_PUBLIC_PREFIX}/${filename}`;
}

export function findStoredFilenameById(id: string) {
  ensureUploadsDir();
  return readdirSync(UPLOADS_DIR).find((filename) => filename === id || filename.startsWith(`${id}.`));
}

export function getMimeTypeByFilename(filename: string) {
  const extension = extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
  };

  return mimeTypes[extension] ?? 'application/octet-stream';
}

export function buildStoredFileMeta(filename: string) {
  const path = join(UPLOADS_DIR, filename);
  const extension = extname(filename).toLowerCase();
  const id = extension ? basename(filename, extension) : filename;
  const stats = statSync(path);

  return {
    id,
    filename,
    extension,
    path,
    url: buildUploadUrl(filename),
    size: stats.size,
    mimeType: getMimeTypeByFilename(filename),
  };
}
