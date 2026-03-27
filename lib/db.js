import mysql from 'mysql2/promise';
import 'dotenv/config';

// Creamos el pool UNA SOLA VEZ (singleton)
export const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 10, // Ajusta según tus necesidades
  queueLimit: 0,
  dateStrings: true,
  timezone: '-05:00',
});