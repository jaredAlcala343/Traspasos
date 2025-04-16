import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtener el ID de la sesión actual desde el query
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: 'Falta el ID de la sesión' });
  }

  // Obtener el token de la sesión actual desde localStorage
  const token = localStorage.getItem(`session_${sessionId}_token`);

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ message: 'Sesión válida', user });
  } catch (error) {
    console.log('❌ Token inválido:', token);
    res.status(401).json({ error: 'Token inválido' });
  }
}
