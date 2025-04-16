import { connectToDatabase } from '../../dbconfig'; // Asegúrate de que la ruta sea correcta

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
        SELECT CIDPRODUCTO, CNOMBREPRODUCTO, CCODIGOPRODUCTO 
        FROM admProductos
        WHERE CIDPRODUCTO != 0 AND CCONTROLEXISTENCIA >= 0
      `); // Cambia "productos" por el nombre real de tu tabla
      res.status(200).json(result.recordset); // Devuelve los productos
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ message: 'Error al obtener productos.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Método ${req.method} no permitido`);
  }
}