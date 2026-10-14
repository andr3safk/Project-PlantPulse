// Servidor API REST — PlantPulse (esqueleto)
// Punto de entrada del backend. Levanta Express y conecta el pool a SQL Server.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connect } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Ruta de verificacion
app.get('/api/health', (req, res) => {
  res.json({ ok: true, servicio: 'PlantPulse API', timestamp: new Date().toISOString() });
});

// Conectar a la BD y arrancar el servidor
try {
  await connect();
  console.log(`Conectado a SQL Server: ${process.env.DB_NAME}`);
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('No se pudo conectar a SQL Server:', err.message);
  process.exit(1);
}
