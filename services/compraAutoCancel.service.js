import { 
  getComprasPendientesExpiradas, 
  anularCompraAutomatica 
} from '../models/compras.model.js';
import { 
  getDetalleByCompraIdModel, 
  actualizarStockMultiple 
} from '../models/detalleCompras.model.js';

export const anularComprasExpiradas = async () => {
  try {
    console.log(`🕐 [${new Date().toISOString()}] Buscando compras pendientes expiradas...`);
    
    // Obtener compras pendientes con más de 1 hora
    const comprasExpiradas = await getComprasPendientesExpiradas();
    
    if (comprasExpiradas.length === 0) {
      console.log('✅ No hay compras pendientes expiradas');
      return { anuladas: 0, compras: [] };
    }
    
    console.log(`📦 Encontradas ${comprasExpiradas.length} compras para anular`);
    
    const resultados = [];
    
    for (const compra of comprasExpiradas) {
      try {
        // Obtener detalles de la compra
        const detalles = await getDetalleByCompraIdModel(compra.CompraId);
        
        // Si la compra tiene productos, restaurar el stock
        if (detalles && detalles.length > 0) {
          const productosARestaurar = detalles.map(d => {
            // Procesar colores si existen
            let coloresProcesados = [];
            if (d.colores && Array.isArray(d.colores) && d.colores.length > 0) {
              coloresProcesados = d.colores.map(c => ({
                ColorId: c.ColorId,
                Stock: -Math.abs(Number(c.Stock) || 0)
              }));
            }
            
            return {
              ProductoId: d.ProductoId,
              Cantidad: -Math.abs(Number(d.Cantidad) || 0),
              colores: coloresProcesados
            };
          });
          
          // Actualizar stock (restar)
          await actualizarStockMultiple(productosARestaurar);
          console.log(`🔄 Stock restaurado para compra ${compra.CompraId}`);
        }
        
        // Anular la compra
        const motivo = `Anulación automática por tiempo expirado (${new Date().toLocaleString()})`;
        await anularCompraAutomatica(compra.CompraId, motivo);
        
        resultados.push({
          compraId: compra.CompraId,
          anulada: true,
          motivo
        });
        
        console.log(`✅ Compra ${compra.CompraId} anulada automáticamente`);
        
      } catch (error) {
        console.error(`❌ Error anulando compra ${compra.CompraId}:`, error);
        resultados.push({
          compraId: compra.CompraId,
          anulada: false,
          error: error.message
        });
      }
    }
    
    return {
      anuladas: resultados.filter(r => r.anulada).length,
      fallidas: resultados.filter(r => !r.anulada).length,
      compras: resultados
    };
    
  } catch (error) {
    console.error('❌ Error en anulación automática:', error);
    throw error;
  }
};