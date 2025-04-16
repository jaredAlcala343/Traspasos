import { connectToDatabase } from '../../dbconfig'; // Asegúrate de que esta ruta sea correcta
import sql from 'mssql'; // Asegúrate de importar sql de mssql

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { almacenID } = req.query; // Obtiene el ID del almacén desde los parámetros de la query

    if (!almacenID) {
      return res.status(400).json({ message: 'Almacén no seleccionado.' });
    }

    try {
      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('almacenID', sql.VarChar, almacenID) // Cambiado a sql.VarChar
        .query(`
          SELECT DISTINCT
            CCODIGOPRODUCTO,
            CNOMBREPRODUCTO,
            EXISTENCIA_TOTAL_PRODUCTO
          FROM 
            ExistenciaProductoAlmacenEjercicio 
          WHERE 
            CCODIGOALMACEN = @almacenID;
        `);

      // Retorna los resultados de la consulta
      res.status(200).json(result.recordset);
    } catch (error) {
      console.error('Error al obtener inventarios:', error);
      res.status(500).json({ message: 'Error al obtener inventarios.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Método ${req.method} no permitido`);
  }
}
