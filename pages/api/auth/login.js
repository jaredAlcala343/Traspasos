import { connectToDatabase, sql } from '../../../dbconfig';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;
  console.log(`🔍 Intento de inicio sesión: ${username}`);

  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('username', sql.VarChar, username.trim())
      .query('SELECT * FROM UsuariosLocal WHERE correo = @username');

    if (result.recordset.length === 0) {
      console.log('❌ Usuario no encontrado');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    if (password.trim() !== user.contraseña.trim()) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.ID, name: user.Nombre, area: user.Rol, puesto: user.Puesto },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`✅ Usuario ${user.Nombre} autenticado correctamente`);

    return res.status(200).json({
      message: 'Login successful',
      userData: { token, name: user.Nombre, rol: user.Rol, origen: user.Clave }
    });

  } catch (error) {
    console.error('🔥 Error en login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
