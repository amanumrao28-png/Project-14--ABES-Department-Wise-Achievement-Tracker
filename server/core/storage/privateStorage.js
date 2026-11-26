import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const SAFE_SEGMENT_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Verifies file binary magic signatures rather than trusting client-supplied MIME headers.
 */
function detectMimeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // PDF: %PDF-
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

const MIME_TO_EXTENSION = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

/**
 * Multer memory upload middleware enforcing file size and declared MIME pre-check.
 * Deep magic-byte validation happens before persisting to private storage.
 */
export const evidenceUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!env.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          400,
          'UNSUPPORTED_FILE_TYPE',
          `Unsupported file type. Allowed types: ${env.ALLOWED_MIME_TYPES.join(', ')}`
        )
      );
    }
    return cb(null, true);
  }
}).single('file');

/**
 * Validates binary magic bytes and persists evidence into an isolated private directory
 * outside any public static directory.
 */
export async function savePrivateEvidenceFile({
  trackerFolder,
  departmentId,
  achievementId,
  file
}) {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new AppError(400, 'FILE_REQUIRED', 'Please attach an evidence file.');
  }

  if (
    !SAFE_SEGMENT_REGEX.test(trackerFolder) ||
    !SAFE_SEGMENT_REGEX.test(departmentId) ||
    !SAFE_SEGMENT_REGEX.test(achievementId)
  ) {
    throw new AppError(400, 'INVALID_STORAGE_SEGMENT', 'Invalid storage identifier.');
  }

  const detectedMime = detectMimeFromBuffer(file.buffer);
  if (!detectedMime || !env.ALLOWED_MIME_TYPES.includes(detectedMime)) {
    throw new AppError(
      400,
      'INVALID_FILE_SIGNATURE',
      'File contents do not match an allowed PDF or image format.'
    );
  }

  const ext = MIME_TO_EXTENSION[detectedMime];
  const fileId = uuidv4();
  const relativeKey = path.join(trackerFolder, departmentId, achievementId, `${fileId}.${ext}`);
  const rootDir = path.resolve(env.UPLOAD_DIR);
  const fullPath = path.resolve(rootDir, relativeKey);

  if (!fullPath.startsWith(rootDir + path.sep)) {
    throw new AppError(400, 'INVALID_STORAGE_PATH', 'Path traversal blocked.');
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, file.buffer, { mode: 0o600 });

  const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

  return {
    originalFilename: path.basename(file.originalname || `evidence.${ext}`).slice(0, 250),
    mimeType: detectedMime,
    fileSizeBytes: file.buffer.length,
    sha256Hash,
    storageObjectKey: relativeKey.replaceAll('\\', '/')
  };
}

/**
 * Streams a private evidence file to an authorized HTTP response with safe headers.
 */
export async function streamPrivateEvidenceFile(res, documentRow) {
  const rootDir = path.resolve(env.UPLOAD_DIR);
  const fullPath = path.resolve(rootDir, documentRow.storage_object_key);

  if (!fullPath.startsWith(rootDir + path.sep)) {
    throw new AppError(400, 'INVALID_STORAGE_PATH', 'Invalid stored object key.');
  }

  try {
    await fs.access(fullPath);
  } catch {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Evidence file was not found on storage.');
  }

  const safeFilename = path.basename(documentRow.original_filename).replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', documentRow.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');

  return new Promise((resolve, reject) => {
    const stream = createReadStream(fullPath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}

/**
 * Removes an evidence file from private disk storage when a draft attachment is deleted.
 */
export async function deletePrivateEvidenceFile(storageObjectKey) {
  const rootDir = path.resolve(env.UPLOAD_DIR);
  const fullPath = path.resolve(rootDir, storageObjectKey);
  if (!fullPath.startsWith(rootDir + path.sep)) {
    return;
  }
  await fs.unlink(fullPath).catch(() => {});
}
