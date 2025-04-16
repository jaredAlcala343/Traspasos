import { serialize } from 'cookie';
import cookie from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 📌 Obtener todas las cookies
  const cookies = cookie.parse(req.headers.cookie || '');

  // 📌 Obtener el ID de la sesión a cerrar (debe enviarse en el body)
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID required' });
  }

  const sessionCookieName = `auth_token_${sessionId}`;

  if (!cookies[sessionCookieName]) {
    return res.status(404).json({ message: 'Session not found' });
  }

  // 🗑️ Eliminar solo la sesión específica
  res.setHeader('Set-Cookie', serialize(sessionCookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 0, // Expira inmediatamente
  }));

  return res.status(200).json({ message: `Session ${sessionId} closed` });
}
