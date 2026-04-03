// test-cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

console.log("Configuración:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "Presente" : "Ausente",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "Presente" : "Ausente"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function test() {
  try {
    console.log("Intentando obtener recursos...");
    const result = await cloudinary.api.resources({ max_results: 1 });
    console.log("Éxito! Conexión válida.");
    console.log("Resultado parcial:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error al conectar con Cloudinary:", error);
  }
}

test();
