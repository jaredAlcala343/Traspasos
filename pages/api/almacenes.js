import { connectToDatabase } from '../../dbconfig'; 

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const pool = await connectToDatabase();
      const result = await pool.request().query(`
       SELECT CIDALMACEN, CNOMBREALMACEN 
       FROM admAlmacenes
       WHERE CIDALMACEN != 0 AND CIDALMACEN != 2 order by CIDALMACEN ASC
      `); 
      res.status(200).json(result.recordset); 
    } catch (error) {
      console.error('Error al obtener almacenes:', error);
      res.status(500).json({ message: 'Error al obtener almacenes.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Método ${req.method} no permitido`);
  }
}
