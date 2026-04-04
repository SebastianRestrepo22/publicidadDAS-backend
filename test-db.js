// test-db-final.js
import { dbPool } from './lib/db.js';

const test = async () => {
    try {
        const email = 'restreposebastian306@gmail.com';
        
        // UPDATE con valor corto para Telefono (VARCHAR(20))
        const [result] = await dbPool.execute(
            `UPDATE usuarios 
             SET ResetToken = ?, ResetTokenExpire = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR), Telefono = ?
             WHERE CorreoElectronico = ?`,
            ['TOKEN_PRUEBA_123', '3001234567', email]  // ← Telefono corto
        );
        
        console.log('✅ UPDATE:', result);
        
        // Verificar
        const [verify] = await dbPool.execute(
            'SELECT ResetToken, ResetTokenExpire FROM usuarios WHERE CorreoElectronico = ?',
            [email]
        );
        
        console.log('✅ Verificación:', verify[0]);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await dbPool.end();
    }
};

test();