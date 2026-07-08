import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// תיקיית ההעלאות — ניתנת להגדרה דרך env (לטסטים).
export const UPLOAD_DIR = process.env.FINANCE_UPLOAD_DIR || path.join(__dirname, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = parseInt(req.params.id) || 'x';
    cb(null, `doc_${id}_${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED.includes(ext)) return cb(null, true);
  cb(new Error('סוג קובץ לא נתמך — רק PDF או תמונה'));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
