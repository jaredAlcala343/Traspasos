import sql from 'mssql';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import 'dotenv/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contrasena } = req.body;

  try {
    // Conectar a la base de datos
    const pool = await sql.connect();

    // Hashear la contraseña ingresada
    const hashedPassword = crypto.createHash('sha256').update(contrasena.trim()).digest('hex').toUpperCase();

    // Realizar la consulta
    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .input('contrasena', sql.VarChar, hashedPassword)
      .query('SELECT usuario, contraseña, rol FROM usuarios WHERE usuario = @usuario AND contraseña = @contrasena');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.recordset[0];

    // Generar un identificador único para la sesión
    const sessionId = `${user.usuario}_${Date.now()}`;

    // Crear token JWT
    const token = jwt.sign(
      { usuario: user.usuario, rol: user.rol, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`✅ Usuario ${user.usuario} autenticado correctamente`);

    return res.status(200).json({
      message: 'Login successful',
      userData: { token, sessionId, rol: user.rol }
    });
  } catch (error) {
    console.error('Error al validar el usuario:', error);
    return res.status(500).json({ error: 'Error al validar el usuario' });
  } finally {
    // Cerrar la conexión
    sql.close();
  }
}