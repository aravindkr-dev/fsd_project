import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const UPLOAD_DIR = path.resolve('uploads');
const useCloudinary = () => !!env.cloudinary.cloudName;

/** Local-disk fallback for development when Cloudinary isn't configured. */
async function saveLocal(buffer, { folder, filename }) {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(6).toString('hex')}-${(filename || 'file').replace(/[^\w.-]/g, '_')}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return { url: `${env.publicApiUrl}/uploads/${folder}/${name}`, publicId: `local:${folder}/${name}`, resourceType: 'raw' };
}

/**
 * Uploads a buffer. Throws AppError(502) on failure so callers never persist a
 * record that points at a file that does not exist.
 */
export async function uploadBuffer(buffer, { folder, resourceType = 'auto', filename } = {}) {
  if (!useCloudinary()) {
    try {
      return await saveLocal(buffer, { folder, filename });
    } catch (err) {
      throw new AppError(502, `File save failed: ${err.message}`);
    }
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `compliance/${folder}`, resource_type: resourceType, public_id: filename, use_filename: !filename },
      (err, result) => {
        if (err || !result) return reject(new AppError(502, `File upload failed: ${err?.message || 'unknown error'}`));
        resolve({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFile(publicId, resourceType = 'image') {
  try {
    if (publicId?.startsWith('local:')) {
      await fs.rm(path.join(UPLOAD_DIR, publicId.slice(6)), { force: true });
    } else if (useCloudinary()) {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (err) {
    console.error('File delete failed:', err.message);
  }
}
