import { Router } from 'express';
import { upload, uploadVoucher } from '../controllers/voucher.controller.js';

const router = Router();

// 🔴 RUTA CORREGIDA: Multer espera campo 'voucher'
router.post('/', upload.single('voucher'), uploadVoucher);

export default router;