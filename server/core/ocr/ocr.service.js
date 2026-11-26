import crypto from 'node:crypto';

const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

/**
 * Normalizes matched date strings into ISO YYYY-MM-DD when unambiguous.
 */
function normalizeDate(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    const n1 = Number(p1);
    const n2 = Number(p2);
    // Assume DD/MM/YYYY by default unless month > 12
    const day = n2 > 12 ? p2 : p1;
    const month = n2 > 12 ? p1 : p2;
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // "15 March 2025" or "March 15, 2025"
  const textDmy = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (textDmy) {
    const month = MONTH_MAP[textDmy[2].toLowerCase()];
    if (month) {
      return `${textDmy[3]}-${month}-${textDmy[1].padStart(2, '0')}`;
    }
  }

  const textMdy = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (textMdy) {
    const month = MONTH_MAP[textMdy[1].toLowerCase()];
    if (month) {
      return `${textMdy[3]}-${month}-${textMdy[2].padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extracts printable ASCII/UTF-8 text segments from a buffer (useful for uncompressed PDFs or text files).
 */
export function extractTextFromBuffer(buffer, mimetype = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return '';
  if (mimetype.startsWith('text/')) {
    return buffer.toString('utf8');
  }
  if (mimetype === 'application/pdf' || buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    const raw = buffer.toString('latin1');
    const chunks = [];
    // Extract parenthesized PDF text literals: (Some Text) Tj / TJ
    const literalRegex = /\(([^()\\]{3,160})\)/g;
    let match;
    while ((match = literalRegex.exec(raw)) !== null) {
      const cleaned = match[1].replace(/[^\x20-\x7E]/g, ' ').trim();
      if (cleaned.length >= 3 && /[a-zA-Z]/.test(cleaned)) {
        chunks.push(cleaned);
      }
    }
    return chunks.join('\n');
  }
  return '';
}

/**
 * Extracts structured certificate fields from raw text using deterministic pattern matching.
 * IMPORTANT: OCR extraction is strictly advisory pre-fill and NEVER constitutes proof of authenticity.
 */
export function extractCertificateFields({ text = '', file = null }) {
  let sourceText = typeof text === 'string' ? text.trim() : '';
  let sha256Hash = null;

  if (file && Buffer.isBuffer(file.buffer)) {
    sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    if (!sourceText) {
      sourceText = extractTextFromBuffer(file.buffer, file.mimetype);
    }
  }

  const lines = sourceText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Recipient Name
  let recipientName = null;
  const namePatterns = [
    /(?:awarded\s+to|presented\s+to|this\s+is\s+to\s+certify\s+that|certify\s+that|recipient\s*[:\-])\s*([A-Z][A-Za-z.\s]{2,60})/i,
    /(?:name\s*[:\-])\s*([A-Z][A-Za-z.\s]{2,60})/i
  ];
  for (const pat of namePatterns) {
    const m = sourceText.match(pat);
    if (m && m[1]) {
      recipientName = m[1].split(/\n|,|has\s+|for\s+|from\s+/i)[0].trim();
      break;
    }
  }

  // 2. Organization / Issuer
  let organization = null;
  const orgPatterns = [
    /(?:issued\s+by|organized\s+by|conducted\s+by|organization\s*[:\-]|institute\s*[:\-]|university\s*[:\-])\s*([A-Za-z0-9&.,\s\-]{3,90})/i,
    /\b((?:IIT|NIT|IIIT|IEEE|ACM|NPTEL|Coursera|Google|Microsoft|AWS|AICTE|UGC|ABES)[A-Za-z0-9&.,\s\-]{0,60})/i
  ];
  for (const pat of orgPatterns) {
    const m = sourceText.match(pat);
    if (m && m[1]) {
      organization = m[1].split(/\r?\n/)[0].trim().replace(/[.,;]+$/, '');
      break;
    }
  }

  // 3. Achievement Title
  let achievementTitle = null;
  const titlePatterns = [
    /(?:certificate\s+of\s+[A-Za-z\s]{2,40}|for\s+(?:participating\s+in|completing|winning|securing|publishing)\s+([^\n.]{4,100}))/i,
    /(?:title\s*[:\-]|event\s*[:\-]|course\s*[:\-]|program\s*[:\-])\s*([^\n]{4,100})/i
  ];
  for (const pat of titlePatterns) {
    const m = sourceText.match(pat);
    if (m) {
      achievementTitle = (m[1] || m[0]).trim().replace(/[.,;]+$/, '');
      break;
    }
  }
  if (!achievementTitle && lines.length > 0) {
    const candidate = lines.find((l) => /certificate|award|hackathon|conference|journal|patent|internship|workshop/i.test(l));
    if (candidate) {
      achievementTitle = candidate.slice(0, 120);
    }
  }

  // 4. Date
  let achievedOn = null;
  const datePatterns = [
    /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/,
    /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/,
    /\b(\d{1,2}\s+(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December),?\s+\d{4})\b/i,
    /\b((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s+\d{4})\b/i
  ];
  for (const pat of datePatterns) {
    const m = sourceText.match(pat);
    if (m && m[1]) {
      const normalized = normalizeDate(m[1]);
      if (normalized) {
        achievedOn = normalized;
        break;
      }
    }
  }

  // 5. Certificate Number
  let certificateNumber = null;
  const certNoPatterns = [
    /(?:certificate\s*(?:no|num|number|id)|cert\s*(?:no|id)|credential\s*(?:id|no)|ref(?:erence)?\s*(?:no|id))\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-\/]{3,40})/i,
    /\b(CERT[\-\/][A-Z0-9\-]{3,30})\b/i
  ];
  for (const pat of certNoPatterns) {
    const m = sourceText.match(pat);
    if (m && m[1]) {
      certificateNumber = m[1].trim();
      break;
    }
  }

  const extractedFieldsCount = [
    recipientName,
    organization,
    achievementTitle,
    achievedOn,
    certificateNumber
  ].filter(Boolean).length;

  return {
    extracted: {
      recipient_name: recipientName,
      organization,
      achievement_title: achievementTitle,
      achieved_on: achievedOn,
      certificate_number: certificateNumber
    },
    file_metadata: file
      ? {
          original_name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          sha256_hash: sha256Hash
        }
      : null,
    extraction_confidence: extractedFieldsCount >= 3 ? 'medium' : extractedFieldsCount > 0 ? 'low' : 'none',
    extracted_fields_count: extractedFieldsCount,
    is_authentic: false,
    verification_status: 'unverified_advisory_only',
    disclaimer:
      'OCR extraction is strictly advisory for form pre-fill and is NEVER proof of authenticity. All submissions remain unverified until reviewed and approved through the official workflow.'
  };
}
