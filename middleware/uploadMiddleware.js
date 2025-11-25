import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import 'dotenv/config'; // Ensure dotenv is loaded

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const createStorage = (folder) => new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: `paper-management/${folder}`, // Optional: organize uploads in a specific folder in Cloudinary
    format: async (req, file) => {
      const extension = file.mimetype.split('/')[1];
      return extension;
    },
    public_id: (req, file) => `${folder}-${Date.now()}-${file.originalname.split('.')[0]}`,
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
