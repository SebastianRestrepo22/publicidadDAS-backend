// server/lib/upload.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import 'dotenv/config';

// Configuración de Cloudinary
console.log("🛠️ [CLOUDINARY] Configurando con:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "PRESENTE" : "AUSENTE",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "PRESENTE" : "AUSENTE"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vouchers',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
    public_id: (req, file) => {
      const uniqueName = `voucher-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      console.log(`🚀 [CLOUDINARY] Subiendo archivo: ${uniqueName}`);
      return uniqueName;
    },
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes o archivos PDF'), false);
  }
};

export const uploadVoucher = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter
});