// Middleware de autenticación JWT — PlantPulse
// Verifica el token JWT en el header Authorization y adjunta el usuario al request
// Todos los rechazos responden 401 con { message: 'No autorizado' } (formato unico de errores)
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'No autorizado' }); // 401, no 403 (contrato con frontend PLAN-35/36)
    }
    
    // Adjuntar el ID del usuario al request para uso en controladores
    req.user = { id: user.id };
    next();
  });
};