import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const TEMP_DIR = path.resolve("public/uploads/temp");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `temp-${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

router.post("/upload-temp", upload.single("archivo"), (req, res) => {
  res.json({
    ok: true,
    url: `/uploads/temp/${req.file.filename}`
  });
});

export default router;