import multer from 'multer';
import path from 'path';

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `uploads/${folder}/`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const createFileFilter = (allowedTypes) => (req, file, cb) => {
  console.log(`Received file mimetype: ${file.mimetype} for file: ${file.originalname}`);
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`));
  }
};

export const uploadPaper = multer({
  storage: createStorage('papers'),
  fileFilter: createFileFilter(['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadReview = multer({
  storage: createStorage('reviews'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadRevision = multer({
  storage: createStorage('revisions'),
  fileFilter: createFileFilter(['application/pdf']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadPaymentProof = multer({
  storage: createStorage('payments'),
  fileFilter: createFileFilter(['image/jpeg', 'image/png', 'application/pdf']),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export const uploadFinalFile = multer({
  storage: createStorage('final'),
  fileFilter: createFileFilter(['application/pdf']),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});
