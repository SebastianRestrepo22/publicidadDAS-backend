import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import 'dotenv/config';

// Configuración de Cloudinary
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `voucher-${uniqueSuffix}`;
    },
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 🔴 CONTROLADOR PRINCIPAL - Acepta campo 'voucher'
export const uploadVoucher = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ 
        error: "Debes adjuntar un comprobante" 
      });
    }

    const rutaVoucher = req.file.path; // URL de Cloudinary

    res.status(200).json({ 
      message: "Comprobante subido exitosamente a la nube", 
      url: rutaVoucher 
    });
    
  } catch (error) {
    console.error("❌ Error al subir voucher:", error);
    
    // Con Cloudinary no es necesario eliminar el archivo local
    
    res.status(500).json({ 
      error: "Error al procesar el comprobante",
      details: error.message 
    });
  }
};