const express = require('express');
const router = express.Router();

router.get('/dashboard/stats', async (req, res) => {
  try {
    // 1. Ventas mensuales
    const [ventasMensuales] = await pool.query(`
      SELECT 
        DATE_FORMAT(FechaVenta, '%b') as mes,
        SUM(Total) as ventas
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND Estado = 'pagado'
      GROUP BY DATE_FORMAT(FechaVenta, '%Y-%m')
      ORDER BY MIN(FechaVenta) ASC
    `);

    // 2. Ventas semanales
    const [ventasSemanales] = await pool.query(`
      SELECT 
        CONCAT('S', WEEK(FechaVenta)) as semana,
        SUM(Total) as ventas
      FROM ventas
      WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado = 'pagado'
      GROUP BY WEEK(FechaVenta)
      ORDER BY MIN(FechaVenta) ASC
    `);

    // 3. Pedidos semanales
    const [pedidosSemanales] = await pool.query(`
      SELECT 
        CONCAT('S', WEEK(FechaRegistro)) as semana,
        COUNT(*) as pedidos
      FROM pedidosclientes
      WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND Estado IN ('aprobado', 'entregado')
      GROUP BY WEEK(FechaRegistro)
      ORDER BY MIN(FechaRegistro) ASC
    `);

    // 4. Usuarios activos para el gráfico de pastel
    const [usuariosData] = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
          THEN ClienteId END) as nuevos,
        COUNT(DISTINCT CASE WHEN FechaRegistro >= DATE_SUB(NOW(), INTERVAL 3 MONTH) 
          AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)
          THEN ClienteId END) as activos,
        COUNT(DISTINCT CASE WHEN FechaRegistro < DATE_SUB(NOW(), INTERVAL 3 MONTH) 
          THEN ClienteId END) as inactivos
      FROM pedidosclientes
    `);

    // 5. Totales para tarjetas
    const [totales] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(Total), 0) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado') as ventas_totales,
        (SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')) as pedidos,
        (SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as usuarios_activos
    `);

    // 6. Calcular variaciones
    const [variaciones] = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(Total), 0) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
         AND Estado = 'pagado') as mes_actual_ventas,
        (SELECT COALESCE(SUM(Total), 0) FROM ventas 
         WHERE FechaVenta >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
         AND FechaVenta < DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado = 'pagado') as mes_anterior_ventas,
        (SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')) as mes_actual_pedidos,
        (SELECT COUNT(*) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
         AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)
         AND Estado IN ('aprobado', 'entregado')) as mes_anterior_pedidos,
        (SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 1 MONTH)) as usuarios_actual,
        (SELECT COUNT(DISTINCT ClienteId) FROM pedidosclientes 
         WHERE FechaRegistro >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
         AND FechaRegistro < DATE_SUB(NOW(), INTERVAL 1 MONTH)) as usuarios_anterior
    `);

    // ➕ 7. NUEVO: Top productos/servicios - Últimos 6 meses (para gráfico mensual)
    const [topProductosMensuales] = await pool.query(`
      SELECT 
        dv.NombreSnapshot as nombre,
        dv.TipoItem as tipo,
        DATE_FORMAT(v.FechaVenta, '%Y-%m') as periodo,
        SUM(dv.Cantidad) as cantidad_vendida,
        SUM(dv.Subtotal) as ingresos
      FROM detalleventas dv
      INNER JOIN ventas v ON dv.VentaId = v.VentaId
      WHERE v.FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND v.Estado = 'pagado'
      GROUP BY dv.ProductoId, dv.ServicioId, dv.NombreSnapshot, dv.TipoItem
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `);

    // ➕ 8. NUEVO: Top productos/servicios - Últimas 6 semanas (para gráfico semanal)
    const [topProductosSemanales] = await pool.query(`
      SELECT 
        dv.NombreSnapshot as nombre,
        dv.TipoItem as tipo,
        WEEK(v.FechaVenta) as periodo,
        SUM(dv.Cantidad) as cantidad_vendida,
        SUM(dv.Subtotal) as ingresos
      FROM detalleventas dv
      INNER JOIN ventas v ON dv.VentaId = v.VentaId
      WHERE v.FechaVenta >= DATE_SUB(NOW(), INTERVAL 6 WEEK)
        AND v.Estado = 'pagado'
      GROUP BY dv.ProductoId, dv.ServicioId, dv.NombreSnapshot, dv.TipoItem
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `);

    // Calcular porcentajes de variación
    const variacionVentas = variaciones[0].mes_anterior_ventas > 0 
      ? ((variaciones[0].mes_actual_ventas - variaciones[0].mes_anterior_ventas) / variaciones[0].mes_anterior_ventas * 100).toFixed(1)
      : 100;

    const variacionPedidos = variaciones[0].mes_anterior_pedidos > 0
      ? ((variaciones[0].mes_actual_pedidos - variaciones[0].mes_anterior_pedidos) / variaciones[0].mes_anterior_pedidos * 100).toFixed(1)
      : 100;

    const variacionUsuarios = variaciones[0].usuarios_anterior > 0
      ? ((variaciones[0].usuarios_actual - variaciones[0].usuarios_anterior) / variaciones[0].usuarios_anterior * 100).toFixed(1)
      : 100;

    // Calcular crecimiento total
    const crecimiento = ((variaciones[0].mes_actual_ventas - variaciones[0].mes_anterior_ventas) / variaciones[0].mes_anterior_ventas * 100).toFixed(1);

    // ➕ Estructurar la respuesta COMPLETA con los nuevos campos
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
        { 
          name: "Nuevos", 
          value: Number(usuariosData[0]?.nuevos || 0), 
          color: "#3b82f6" 
        },
        { 
          name: "Activos", 
          value: Number(usuariosData[0]?.activos || 0), 
          color: "#10b981" 
        },
        { 
          name: "Inactivos", 
          value: Number(usuariosData[0]?.inactivos || 0), 
          color: "#f59e0b" 
        }
      ],
      totales: {
        ventasTotales: Number(totales[0]?.ventas_totales || 0),
        pedidos: Number(totales[0]?.pedidos || 0),
        usuariosActivos: Number(totales[0]?.usuarios_activos || 0),
        crecimiento: Number(crecimiento || 0),
        variacionVentas: Number(variacionVentas || 0),
        variacionPedidos: Number(variacionPedidos || 0),
        variacionUsuarios: Number(variacionUsuarios || 0),
        variacionCrecimiento: Number(variacionVentas || 0)
      },
      // ➕ NUEVOS CAMPOS: Top productos/servicios
      topProductosMensuales: topProductosMensuales.map(item => ({
        nombre: item.nombre,
        tipo: item.tipo,
        cantidad: Number(item.cantidad_vendida),
        ingresos: Number(item.ingresos)
      })),
      topProductosSemanales: topProductosSemanales.map(item => ({
        nombre: item.nombre,
        tipo: item.tipo,
        cantidad: Number(item.cantidad_vendida),
        ingresos: Number(item.ingresos)
      }))
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos del dashboard',
      details: error.message 
    });
  }
});

module.exports = router;