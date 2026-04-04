import { v4 as uuidv4 } from 'uuid';

// Tipos de documento por defecto
const DEFAULT_DOCUMENT_TYPES = [
    'Cédula de Ciudadanía',
    'Tarjeta de Identidad',
    'Cédula de Extranjería',
    'Pasaporte',
    'Permiso Especial de Permanencia',
    'Permiso por Protección Temporal'
];

// Colores por defecto
const DEFAULT_COLORS = [
    { Nombre: 'Rojo', Hex: '#FF0000' },
    { Nombre: 'Azul', Hex: '#0000FF' },
    { Nombre: 'Verde', Hex: '#00FF00' },
    { Nombre: 'Negro', Hex: '#000000' },
    { Nombre: 'Blanco', Hex: '#FFFFFF' },
    { Nombre: 'Amarillo', Hex: '#FFFF00' },
    { Nombre: 'Gris', Hex: '#808080' },
    { Nombre: 'Rosado', Hex: '#FFC0CB' },
    { Nombre: 'Morado', Hex: '#800080' },
    { Nombre: 'Naranja', Hex: '#FFA500' },
    { Nombre: 'Café', Hex: '#8B4513' },
    { Nombre: 'Celeste', Hex: '#87CEEB' },
    { Nombre: 'Turquesa', Hex: '#40E0D0' },
    { Nombre: 'Fucsia', Hex: '#FF00FF' },
    { Nombre: 'Lima', Hex: '#32CD32' },
    { Nombre: 'Vino Tinto', Hex: '#800020' },
    { Nombre: 'Beige', Hex: '#F5F5DC' },
    { Nombre: 'Gris Claro', Hex: '#D3D3D3' },
    { Nombre: 'Gris Oscuro', Hex: '#A9A9A9' },
];

export const initializeDefaultData = async (connection) => {
    // 1. Crear tipos de documento si no existen
    console.log('   Creando tipos de documento...');
    for (const docType of DEFAULT_DOCUMENT_TYPES) {
        const [existingType] = await connection.execute(
            'SELECT * FROM tipodocumento WHERE Nombre = ?',
            [docType]
        );

        if (existingType.length === 0) {
            const typeId = uuidv4();
            await connection.execute(
                'INSERT INTO tipodocumento (TipoDocumentoId, Nombre) VALUES (?, ?)',
                [typeId, docType]
            );
            console.log(`     ✓ Tipo documento '${docType}' creado.`);
        } else {
            console.log(`     ✓ Tipo documento '${docType}' ya existe.`);
        }
    }

    // 2. Crear colores si no existen
    console.log('   Creando colores del sistema...');
    for (const color of DEFAULT_COLORS) {
        const [existingColor] = await connection.execute(
            'SELECT * FROM colores WHERE Nombre = ?',
            [color.Nombre]
        );

        if (existingColor.length === 0) {
            const colorId = uuidv4();
            await connection.execute(
                'INSERT INTO colores (ColorId, Nombre, Hex) VALUES (?, ?, ?)',
                [colorId, color.Nombre, color.Hex]
            );
            console.log(`     ✓ Color '${color.Nombre}' creado.`);
        } else {
            console.log(`     ✓ Color '${color.Nombre}' ya existe.`);
        }
    }

    // 3. Verificar estructura de otras tablas importantes
    console.log('   Verificando estructura de tablas...');

    // Verificar tabla categorías
    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM categorias');
    console.log(`     ✓ Tabla 'categorias' verificada (${categories[0].count} registros).`);

    // Verificar tabla proveedores
    const [providers] = await connection.execute('SELECT COUNT(*) as count FROM proveedores');
    console.log(`     ✓ Tabla 'proveedores' verificada (${providers[0].count} registros).`);
    console.log('    Datos por defecto configurados correctamente.');
};