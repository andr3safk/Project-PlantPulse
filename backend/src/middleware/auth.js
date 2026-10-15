// Middleware de autenticación JWT — PlantPulse
// Verifica el token JWT en el header Authorization y adjunta el usuario al request
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.sendStatus(401);
  }
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(401); // 401, no 403 (contrato con frontend PLAN-35/36)
    }
    
    // Adjuntar el ID del usuario al request para uso en controladores
    req.user = { id: user.id };
    next();
  });
};