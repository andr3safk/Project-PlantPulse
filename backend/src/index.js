// Punto de entrada del servidor API REST — PlantPulse
// Conecta el pool a SQL Server y arranca el servidor Express
import dotenv from 'dotenv';
import app from './app.js';
import { connect } from './db.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Conectar a la BD y arrancar el servidor
const startServer = async () => {
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
};

startServer();
