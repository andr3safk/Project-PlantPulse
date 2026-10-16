// Configuración de la aplicación Express — PlantPulse
// Contiene middlewares y rutas, se exporta para usar en index.js y para pruebas
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import plantRoutes from './routes/plants.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);

// Ruta de verificacion
app.get('/api/health', (req, res) => {
  res.json({ ok: true, servicio: 'PlantPulse API', timestamp: new Date().toISOString() });
});

export default app;