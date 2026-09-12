import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const MB = 1024 * 1024;

const TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
};

/**
 * In-memory multer instance restricted to a set of MIME types. Files are then
 * handed to storageService (Cloudinary or local disk).
 */
export function uploader(kind = 'image', { maxSizeMb = 10, maxFiles = 10 } = {}) {
  const allowed = TYPES[kind] || TYPES.image;
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * MB, files: maxFiles },
    fileFilter(_req, file, cb) {
      if (allowed.includes(file.mimetype)) return cb(null, true);
      const readable = kind === 'image' ? 'JPG, PNG, WEBP or GIF images' : 'PDF or image files';
      return cb(ApiError.badRequest(`Unsupported file type "${file.originalname}". Please upload ${readable}.`));
    },
  });
}

export const imageUpload = uploader('image', { maxSizeMb: 5 });
export const documentUpload = uploader('document', { maxSizeMb: 10 });
