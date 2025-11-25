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
  params: async (req, file) => {
    const parts = file.originalname.split('.');
    const extension = parts[parts.length - 1]; // Use the actual file extension
    let resourceType = 'raw'; // Default to raw for documents

    // For payment proofs, allow image type if it's an image
    if (folder === 'payments' && (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf')) {
      resourceType = 'auto'; // Let Cloudinary auto-detect for images/PDFs in payments
    }

    return {
      folder: `paper-management/${folder}`, // Optional: organize uploads in a specific folder in Cloudinary
      format: extension,
      public_id: `${folder}-${Date.now()}-${parts[0]}`,
      resource_type: resourceType,
    };
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
