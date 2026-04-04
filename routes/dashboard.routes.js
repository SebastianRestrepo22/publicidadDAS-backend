// server/routes/dashboard.routes.js
import express from 'express';
import { dbPool } from '../lib/db.js';

const router = express.Router();

const calcularVariacion = (actual, anterior) => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Number(((actual - anterior) / anterior * 100).toFixed(1));
};

router.get('/stats', async (req, res) => {
  try {
    // 1. Ventas mensuales (últimos 6 meses)
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

    // 2. Ventas semanales (últimas 6 semanas)
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

    // 3. Pedidos semanales (últimas 6 semanas)
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

    // 4. Compras semanales (últimas 6 semanas)
    const [comprasSemanales] = await dbPool.query(`
      SELECT 
        MIN(CONCAT('S', WEEK(FechaRegistro))) as semana,
        COUNT(*) as compras,
        COALESCE(SUM(Total), 0) as total_compras,
        YEARWEEK(FechaRegistro) as orden
      FROM compras
      WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado IN ('aprobado', 'recibido')
      GROUP BY YEARWEEK(FechaRegistro)
      ORDER BY orden ASC
    `);

    // 5. Totales del último mes
    const [totales] = await dbPool.query(`
      SELECT
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado'), 0) as ventas_totales,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')), 0) as pedidos,
        COALESCE((SELECT SUM(Total) FROM compras 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'recibido')), 0) as total_compras_mes
    `);

    // 6. Variaciones para cálculos
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
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
         AND Estado = 'pagado'), 0) as semana_actual_ventas,
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 2 WEEK)
         AND FechaVenta < DATE_SUB(NOW(), INTERVAL 1 WEEK)
         AND Estado = 'pagado'), 0) as semana_anterior_ventas
    `);

    // Calcular variaciones
    const v = variaciones[0];
    const variacionVentas = calcularVariacion(v.mes_actual_ventas, v.mes_anterior_ventas);
    const variacionPedidos = calcularVariacion(v.mes_actual_pedidos, v.mes_anterior_pedidos);
    const variacionSemanalVentas = calcularVariacion(v.semana_actual_ventas, v.semana_anterior_ventas);

    // Crecimiento basado en ventas
    // Crecimiento basado en ventas y pedidos
    const crecimientoVentas = calcularVariacion(v.mes_actual_ventas, v.mes_anterior_ventas);
    const crecimientoPedidos = calcularVariacion(v.mes_actual_pedidos, v.mes_anterior_pedidos);
    const crecimiento = Number(((crecimientoVentas + crecimientoPedidos) / 2).toFixed(1));

    // Calcular promedio de compras semanales
    const comprasPromedio = comprasSemanales.length > 0
      ? Number((comprasSemanales.reduce((sum, item) => sum + Number(item.compras), 0) / comprasSemanales.length).toFixed(0))
      : 0;

    // Respuesta estructurada (SIN USUARIOS)
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
      comprasSemanales: comprasSemanales.map(item => ({
        semana: item.semana,
        compras: Number(item.compras)
      })),
      totales: {
        ventasTotales: Number(totales[0]?.ventas_totales || 0),
        pedidos: Number(totales[0]?.pedidos || 0),
        comprasSemanales: comprasPromedio,
        crecimiento: Number(crecimiento),
        variacionVentas: variacionVentas,
        variacionPedidos: variacionPedidos,
        variacionCrecimiento: variacionSemanalVentas,
        totalComprasMes: Number(totales[0]?.total_compras_mes || 0)
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