// Pool de conexión a SQL Server — PlantPulse
// Se crea un unico pool al arrancar la app y se reutiliza (buena practica).
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  },
};

export const pool = new sql.ConnectionPool(dbConfig);

// Conectar al arrancar; lanza error si la BD no esta disponible
export async function connect() {
  await pool.connect();
  return pool;
}
