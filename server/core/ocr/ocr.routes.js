import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuthenticated } from '../middleware/authorize.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { sendSuccess } from '../utils/response.js';
import { extractCertificateFields } from './ocr.service.js';

const router = Router();

const ocrUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 1
  }
}).single('file');

function optionalOcrUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return ocrUpload(req, res, next);
  }
  return next();
}

/**
 * POST /api/v1/ocr/extract
 * Extracts advisory certificate fields from uploaded file or pasted certificate text.
 * Never marks any submission as authentic or verified.
 */
router.post(
  '/extract',
  authenticate,
  requireAuthenticated(),
  uploadRateLimiter,
  optionalOcrUpload,
  (req, res) => {
    const text = req.body?.text || req.body?.extracted_text || '';
    const result = extractCertificateFields({
      text,
      file: req.file || null
    });

    return sendSuccess(res, result);
  }
);

export default router;
