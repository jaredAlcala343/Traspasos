import { connectToDatabase, sql } from '../../dbconfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pool = await connectToDatabase();
    const result = await pool.request()
      .query(`SELECT TOP 10 
                p.Producto, 
                SUM(p.Unidades) AS totalUnidades, 
                pr.CCODIGOPRODUCTO 
              FROM Pedidos p 
              INNER JOIN admProductos pr 
              ON p.Producto = pr.CIDPRODUCTO 
              GROUP BY p.Producto, pr.CCODIGOPRODUCTO 
              ORDER BY totalUnidades DESC;`);

    if (!result.recordset || !Array.isArray(result.recordset)) {
      return res.status(500).json({ message: 'Datos inválidos recibidos de la base de datos.' });
    }

    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('🔥 Error en top-products:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
