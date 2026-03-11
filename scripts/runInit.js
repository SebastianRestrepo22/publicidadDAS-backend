import { initDatabase } from './initDatabase.js';

// Ejecutar inicialización
const runInitialization = async () => {
    console.log('============================================');
    console.log('   SISTEMA DE INICIALIZACIÓN DE BASE DE DATOS');
    console.log('============================================\n');
    
    await initDatabase();
    
    console.log('\n============================================');
    console.log('   PROCESO COMPLETADO');
    console.log('============================================');
};

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
    console.error(' Error no manejado:', error);
    process.exit(1);
});

// Ejecutar el script
runInitialization().catch(console.error);