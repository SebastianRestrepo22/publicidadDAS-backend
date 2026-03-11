// server/routes/dashboard.routes.js
import express from 'express';
import { dbPool } from '../lib/db.js';

const router = express.Router();

const calcularVariacion = (actual, anterior) => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return ((actual - anterior) / anterior * 100).toFixed(1);
};

router.get('/stats', async (req, res) => {
  try {
    // 1. ✅ Ventas mensuales - CORREGIDO para ONLY_FULL_GROUP_BY
    const [ventasMensuales] = await dbPool.query(`
      SELECT 
        MIN(DATE_FORMAT(FechaVenta, '%b')) as mes,
        SUM(Total) as ventas,
        DATE_FORMAT(FechaVenta, '%Y-%m') as mes_orden
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND Estado = 'pagado'
      GROUP BY DATE_FORMAT(FechaVenta, '%Y-%m')
      ORDER BY mes_orden ASC
    `);

    // 2. ✅ Ventas semanales - CORREGIDO
    const [ventasSemanales] = await dbPool.query(`
      SELECT 
        MIN(CONCAT('S', WEEK(FechaVenta))) as semana,
        SUM(Total) as ventas,
        YEARWEEK(FechaVenta) as orden
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado = 'pagado'
      GROUP BY YEARWEEK(FechaVenta)
      ORDER BY orden ASC
    `);

    // 3. ✅ Pedidos semanales - CORREGIDO
    const [pedidosSemanales] = await dbPool.query(`
      SELECT 
        MIN(CONCAT('S', WEEK(FechaRegistro))) as semana,
        COUNT(*) as pedidos,
        YEARWEEK(FechaRegistro) as orden
      FROM pedidosclientes
      WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado IN ('aprobado', 'entregado')
      GROUP BY YEARWEEK(FechaRegistro)
      ORDER BY orden ASC
    `);

    // 4. ✅ Usuarios para pie chart - CORREGIDO (sin GROUP BY problemático)
    const [usuariosData] = await dbPool.query(`
      SELECT 
        COUNT(DISTINCT CASE 
          WHEN FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN ClienteId 
        END) as nuevos,
        COUNT(DISTINCT CASE 
          WHEN FechaRegistro >= DATE_SUB(NOW(), INTERVAL 3 MONTH) 
          AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN ClienteId 
        END) as activos,
        COUNT(DISTINCT CASE 
          WHEN FechaRegistro < DATE_SUB(NOW(), INTERVAL 3 MONTH) THEN ClienteId 
        END) as inactivos
      FROM pedidosclientes
      WHERE ClienteId IS NOT NULL
    `);

    // 5. ✅ Totales para tarjetas - Sin GROUP BY, sin problema
    const [totales] = await dbPool.query(`
      SELECT
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado'), 0) as ventas_totales,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')), 0) as pedidos,
        COALESCE((SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)), 0) as usuarios_activos
    `);

    // 6. ✅ Variaciones - Sin GROUP BY, sin problema
    const [variaciones] = await dbPool.query(`
      SELECT
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado'), 0) as mes_actual_ventas,
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
         AND FechaVenta < DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado = 'pagado'), 0) as mes_anterior_ventas,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')), 0) as mes_actual_pedidos,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
         AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')), 0) as mes_anterior_pedidos,
        COALESCE((SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)), 0) as usuarios_actual,
        COALESCE((SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
         AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)), 0) as usuarios_anterior
    `);

    // Calcular variaciones
    const v = variaciones[0];
    const variacionVentas = calcularVariacion(v.mes_actual_ventas, v.mes_anterior_ventas);
    const variacionPedidos = calcularVariacion(v.mes_actual_pedidos, v.mes_anterior_pedidos);
    const variacionUsuarios = calcularVariacion(v.usuarios_actual, v.usuarios_anterior);
    const crecimiento = calcularVariacion(v.mes_actual_ventas, v.mes_anterior_ventas);

    // 7. Respuesta estructurada
    const dashboardData = {
      ventasMensuales: ventasMensuales.map(item => ({ 
        mes: item.mes, 
        ventas: Number(item.ventas) 
      })),
      ventasSemanales: ventasSemanales.map(item => ({ 
        semana: item.semana, 
        ventas: Number(item.ventas) 
      })),
      pedidosSemanales: pedidosSemanales.map(item => ({ 
        semana: item.semana, 
        pedidos: Number(item.pedidos) 
      })),
      usuariosActivos: [
        { name: "Nuevos", value: Number(usuariosData[0]?.nuevos || 0), color: "#3b82f6" },
        { name: "Activos", value: Number(usuariosData[0]?.activos || 0), color: "#10b981" },
        { name: "Inactivos", value: Number(usuariosData[0]?.inactivos || 0), color: "#f59e0b" }
      ],
      totales: {
        ventasTotales: Number(totales[0]?.ventas_totales || 0),
        pedidos: Number(totales[0]?.pedidos || 0),
        usuariosActivos: Number(totales[0]?.usuarios_activos || 0),
        crecimiento: Number(crecimiento),
        variacionVentas: Number(variacionVentas),
        variacionPedidos: Number(variacionPedidos),
        variacionUsuarios: Number(variacionUsuarios),
        variacionCrecimiento: Number(variacionVentas)
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Error en dashboard:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos del dashboard',
      details: error.message 
    });
  }
});

export default router;