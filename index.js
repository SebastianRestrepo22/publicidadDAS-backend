import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Rutas de negocio
import proveedorRoutes from './routes/proveedores.routes.js';
import categoriaRoutes from './routes/categoria.routes.js';
import comprasRoutes from './routes/compras.routes.js';
import detalleComprasRoutes from './routes/detalleCompras.routes.js';
import pedidoClienteRoutes from "./routes/pedidoCliente.routes.js";
import detallePedidoClienteRoutes from "./routes/detallePedidoCliente.routes.js";
import ventasRoutes from "./routes/venta.routes.js";
import detalleVentasRoutes from "./routes/detalleVentas.routes.js";
import productoRouter from './routes/producto.routes.js';
import servicioRouter from './routes/services.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import colorRoutes from "./routes/color.routes.js";
import clientRouter from './routes/cliente.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadTempRoutes from './routes/uploadTemporal.js';

// Auth
import authRouter from './routes/authRoutes.js';
import roleRouter from './routes/role.routes.js';
import userRouter from './routes/user.routes.js';
import tipoDocumentoRoutes from './routes/tipoDocumento.js';

// Scripts
import { initRolesAndAdmin } from './scripts/initRolesAndAdmin.js';
import { dbPool } from './lib/db.js';

dotenv.config();

const app = express();

// Configuración CORS más segura usando variable de entorno
const allowedOrigins = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://publicidad-das-aplication.vercel.app',
  process.env.FRONTEND_URL  
].filter(Boolean); 

app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (como Postman, móviles, etc.)
    if (!origin) return callback(null, true);

    if (
      origin.includes("localhost") ||
      origin.includes("vercel.app") ||
      origin.includes("web.app") ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    ) {
      callback(null, true);
    } else {
      console.warn(`Origen no permitido por CORS: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/comprobantes', express.static(path.join(__dirname, '../public/comprobantes')));

// Auth
app.use('/auth', authRouter);
app.use('/roles', roleRouter);
app.use('/user', userRouter);

// Generales
app.use('/client', clientRouter);
app.use('/producto', productoRouter);
app.use('/servicio', servicioRouter);
app.use("/colores", colorRoutes);
app.use('/tipos-documento', tipoDocumentoRoutes);
app.use('/api', uploadTempRoutes);

// Negocio
app.use('/api/categorias', categoriaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/detalle-compras', detalleComprasRoutes);
app.use("/api/pedidos-clientes", pedidoClienteRoutes);
app.use("/api/detalle-pedido", detallePedidoClienteRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/detalle-ventas", detalleVentasRoutes);
app.use('/api/voucher', voucherRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const startServer = async () => {
  try {
    // inicializar roles y admin usando pool
    await initRolesAndAdmin(dbPool);

    const port = process.env.PORT || 3000;

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`CORS permitido para: ${allowedOrigins.join(', ')}`);
    });

  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  }
};

startServer();