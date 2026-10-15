// Rutas de autenticación — PlantPulse
// Endpoints para login y gestión de sesiones
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = Router();

// POST /api/auth/login
// Inicia sesión con email y password, devuelve JWT si son válidos
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validación básica de entrada
  if (!email || !password) {
    return res.status(400).json({ message: 'Email y password son requeridos' });
  }

  try {
    // Buscar usuario por email (consulta parametrizada para prevenir inyección)
    const result = await pool.request()
      .input('email', email)
      .query('SELECT Id, PasswordHash FROM Users WHERE Email = @email');

    // Si no se encuentra el usuario, devolver error genérico
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const user = result.recordset[0];
    
    // Verificar la contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Crear y devolver el JWT
    const token = jwt.sign(
      { id: user.Id }, // Payload: solo el ID del usuario
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN } // Ej: "24h"
    );

    res.json({ token });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;