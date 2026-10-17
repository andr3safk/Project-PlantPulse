// Configuración de la aplicación Express — PlantPulse
// Contiene middlewares y rutas, se exporta para usar en index.js y para pruebas
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import plantRoutes from './routes/plants.js';
import deviceRoutes from './routes/devices.js';
import { pool } from './db.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/devices', deviceRoutes);

// Ruta de verificacion
app.get('/api/health', (req, res) => {
  res.json({ ok: true, servicio: 'PlantPulse API', timestamp: new Date().toISOString() });
});

// Manejador 404: va DESPUES de todas las rutas. Si ninguna ruta respondio,
// la peticion llega aqui. Sin esto, Express responde con una pagina HTML
// ("Cannot GET ...") y el frontend no podria leer body.message.
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware de errores: Express lo reconoce porque recibe 4 parametros
// (err, req, res, next). Atrapa los errores lanzados por express.json() y
// por las rutas, y los convierte al formato unico { message } de la API.
// `next` no se usa, pero debe declararse: con 3 parametros Express lo trataria
// como un middleware normal y nunca le pasaria los errores.
app.use((err, req, res, next) => {
  // express.json() no pudo interpretar el cuerpo (ej: '{"email": ').
  // Es un error del cliente, no del servidor: 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' });
  }

  // El cuerpo supera el limite de express.json() (100kb por defecto): 413.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande' });
  }

  // Cualquier otro error es inesperado: se registra en la consola del servidor
  // para depurar, pero al cliente solo se le envia un mensaje generico para no
  // filtrar detalles internos (stack trace, consultas SQL, rutas de archivos).
  console.error('Error no controlado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

export default app;