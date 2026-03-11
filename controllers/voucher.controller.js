import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('public', 'uploads', 'vouchers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'voucher-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/jpg', 
    'image/gif',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, JPG, GIF) y PDFs'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 🔴 CONTROLADOR PRINCIPAL - Acepta campo 'voucher'
export const uploadVoucher = async (req, res) => {
  try {
    console.log('📤 Recibiendo archivo para voucher...');
    console.log('📄 Archivo recibido:', req.file);
    console.log('📋 Campos del body:', req.body);

    if (!req.file) {
      console.log('❌ No se recibió archivo');
      return res.status(400).json({ 
        error: "Debes adjuntar un comprobante" 
      });
    }

    const rutaVoucher = `/uploads/vouchers/${req.file.filename}`;
    console.log('✅ Voucher subido:', rutaVoucher);

    res.status(200).json({ 
      message: "Comprobante subido exitosamente", 
      url: rutaVoucher 
    });
    
  } catch (error) {
    console.error("❌ Error al subir voucher:", error);
    
    // Limpiar archivo si hubo error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error eliminando archivo:", err);
      });
    }
    
    res.status(500).json({ 
      error: "Error al procesar el comprobante",
      details: error.message 
    });
  }
};