// Middleware de autenticación JWT — PlantPulse
// Verifica el token JWT en el header Authorization y adjunta el usuario al request
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // No autorizado si no hay token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Prohibido si el token es inválido
    }
    
    // Adjuntar el ID del usuario al request para uso en controladores
    req.user = { id: user.id };
    next();
  });
};