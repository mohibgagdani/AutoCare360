import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudinary, isCloudinaryEnabled } from '../config/cloudinary.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
};

const safeFolder = (folder) => String(folder || 'misc').replace(/[^a-z0-9_-]/gi, '');

function uploadToCloudinary(buffer, { folder, mimeType }) {
  const resourceType = mimeType?.startsWith('image/') ? 'image' : 'raw';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `autocare360/${folder}`, resource_type: resourceType, use_filename: false, unique_filename: true },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Persists a buffer and returns a file descriptor matching `fileSchema`.
 * Uses Cloudinary when configured, otherwise the local uploads folder.
 */
export async function uploadBuffer(buffer, { originalName = 'file', mimeType = 'application/octet-stream', folder } = {}) {
  const dir = safeFolder(folder);

  if (isCloudinaryEnabled) {
    const result = await uploadToCloudinary(buffer, { folder: dir, mimeType });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      provider: 'cloudinary',
      resourceType: result.resource_type,
      originalName,
      mimeType,
      size: buffer.length,
    };
  }

  const ext = EXTENSIONS[mimeType] || path.extname(originalName).toLowerCase() || '';
  const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const targetDir = path.join(UPLOAD_ROOT, dir);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, fileName), buffer);
  return {
    url: `/uploads/${dir}/${fileName}`,
    publicId: `${dir}/${fileName}`,
    provider: 'local',
    resourceType: mimeType.startsWith('image/') ? 'image' : 'raw',
    originalName,
    mimeType,
    size: buffer.length,
  };
}

/** Uploads a multer (memory storage) file. */
export function uploadFile(file, folder) {
  if (!file) return null;
  return uploadBuffer(file.buffer, { originalName: file.originalname, mimeType: file.mimetype, folder });
}

export async function uploadFiles(files = [], folder) {
  return Promise.all(files.map((f) => uploadFile(f, folder)));
}

export async function deleteFile(file) {
  if (!file?.publicId) return;
  try {
    if (file.provider === 'cloudinary') {
      if (!isCloudinaryEnabled) return;
      await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType || 'image' });
      return;
    }
    const target = path.resolve(UPLOAD_ROOT, file.publicId);
    // Guard against path traversal — only delete inside the uploads folder.
    if (!target.startsWith(UPLOAD_ROOT + path.sep)) return;
    await fs.unlink(target);
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn(`Could not delete file ${file.publicId}: ${error.message}`);
  }
}

export const deleteFiles = (files = []) => Promise.allSettled(files.filter(Boolean).map(deleteFile));
