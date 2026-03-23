const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Función para calcular variación porcentual
const calcularVariacion = (actual, anterior) => {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Number(((actual - anterior) / anterior * 100).toFixed(1));
};

router.get('/dashboard/stats', async (req, res) => {
  try {
    // 1. Ventas mensuales (últimos 6 meses)
    const [ventasMensuales] = await pool.query(`
      SELECT 
        DATE_FORMAT(FechaVenta, '%b') as mes,
        SUM(Total) as ventas,
        DATE_FORMAT(FechaVenta, '%Y-%m') as mes_orden
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND Estado = 'pagado'
      GROUP BY DATE_FORMAT(FechaVenta, '%Y-%m')
      ORDER BY MIN(FechaVenta) ASC
    `);

    // 2. Ventas semanales (últimas 6 semanas)
    const [ventasSemanales] = await pool.query(`
      SELECT 
        CONCAT('S', WEEK(FechaVenta)) as semana,
        SUM(Total) as ventas,
        YEARWEEK(FechaVenta) as orden
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado = 'pagado'
      GROUP BY WEEK(FechaVenta)
      ORDER BY MIN(FechaVenta) ASC
    `);

    // 3. Pedidos semanales (últimas 6 semanas)
    const [pedidosSemanales] = await pool.query(`
      SELECT 
        CONCAT('S', WEEK(FechaRegistro)) as semana,
        COUNT(*) as pedidos,
        YEARWEEK(FechaRegistro) as orden
      FROM pedidosclientes
      WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado IN ('aprobado', 'entregado', 'finalizado')
      GROUP BY WEEK(FechaRegistro)
      ORDER BY MIN(FechaRegistro) ASC
    `);

    // 4. Compras semanales (últimas 6 semanas)
    const [comprasSemanales] = await pool.query(`
      SELECT 
        CONCAT('S', WEEK(c.FechaRegistro)) as semana,
        COUNT(*) as compras,
        COALESCE(SUM(c.Total), 0) as total_compras,
        YEARWEEK(c.FechaRegistro) as orden
      FROM compras c
      WHERE c.FechaRegistro >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND c.Estado IN ('aprobado', 'recibido')
      GROUP BY WEEK(c.FechaRegistro)
      ORDER BY MIN(c.FechaRegistro) ASC
    `);

    // 5. Calcular promedio de compras semanales
    const comprasPromedio = comprasSemanales.length > 0
      ? Number((comprasSemanales.reduce((sum, item) => sum + Number(item.compras), 0) / comprasSemanales.length).toFixed(0))
      : 0;

    // 6. Totales del último mes
    const [totales] = await pool.query(`
      SELECT
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado'), 0) as ventas_totales,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado', 'finalizado')), 0) as pedidos,
        COALESCE((SELECT SUM(Total) FROM compras 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'recibido')), 0) as total_compras_mes
    `);

    // 7. Variaciones para cálculos de crecimiento
    const [variaciones] = await pool.query(`
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
         AND Estado IN ('aprobado', 'entregado', 'finalizado')), 0) as mes_actual_pedidos,
        COALESCE((SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
         AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado', 'finalizado')), 0) as mes_anterior_pedidos,
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 WEEK)
         AND Estado = 'pagado'), 0) as semana_actual_ventas,
        COALESCE((SELECT SUM(Total) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 2 WEEK)
         AND FechaVenta < DATE_SUB(NOW(), INTERVAL 1 WEEK)
         AND Estado = 'pagado'), 0) as semana_anterior_ventas
    `);

    // Asegurar que variaciones[0] existe
    const v = variaciones[0] || {};

    // Calcular variaciones con valores por defecto
    const variacionVentas = calcularVariacion(v.mes_actual_ventas || 0, v.mes_anterior_ventas || 0);
    const variacionPedidos = calcularVariacion(v.mes_actual_pedidos || 0, v.mes_anterior_pedidos || 0);
    const variacionSemanalVentas = calcularVariacion(v.semana_actual_ventas || 0, v.semana_anterior_ventas || 0);

    // Crecimiento basado en ventas
    const crecimiento = variacionVentas;

    // Variación del crecimiento (comparación semanal)
    const variacionCrecimiento = variacionSemanalVentas;

    // 8. Estructurar la respuesta
    const dashboardData = {
      ventasMensuales: ventasMensuales.map(item => ({
        mes: item.mes,
        ventas: Number(item.ventas) || 0
      })),
      ventasSemanales: ventasSemanales.map(item => ({
        semana: item.semana,
        ventas: Number(item.ventas) || 0
      })),
      pedidosSemanales: pedidosSemanales.map(item => ({
        semana: item.semana,
        pedidos: Number(item.pedidos) || 0
      })),
      comprasSemanales: comprasSemanales.map(item => ({
        semana: item.semana,
        compras: Number(item.compras) || 0
      })),
      totales: {
        ventasTotales: Number(totales[0]?.ventas_totales || 0),
        pedidos: Number(totales[0]?.pedidos || 0),
        comprasSemanales: comprasPromedio,
        crecimiento: Number(crecimiento),
        variacionVentas: Number(variacionVentas),
        variacionPedidos: Number(variacionPedidos),
        variacionCrecimiento: Number(variacionCrecimiento),
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

module.exports = router;