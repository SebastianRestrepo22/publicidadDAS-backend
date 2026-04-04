// src/routes/comprobantes.routes.js
import { Router } from "express";
import { uploadComprobante, getComprobanteByPedidoId, updateComprobanteEstado } from "../controllers/comprobante.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Crear carpeta si no existe
const uploadDir = path.join(process.cwd(), "public", "comprobantes");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: "public/comprobantes",
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos JPG, PNG o PDF"));
    }
  }
});

const router = Router();

router.post("/", upload.single("comprobante"), uploadComprobante);
router.get("/:id", getComprobanteByPedidoId);
router.put("/:id", updateComprobanteEstado);

export default router;