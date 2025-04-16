import { connectToDatabase, sql } from '../../dbconfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { origen } = req.query;
    
    console.log("Origen recibido:", origen); // Depuración

    if (!origen) {
      return res.status(400).json({ message: 'Falta el parámetro de origen' });
    }

    const pool = await connectToDatabase();

    console.log("Conexión a la base de datos exitosa"); // Depuración

    const query = `
      SELECT 
        COUNT(DISTINCT p.NumeroPedido) AS totalOrders, 
        COUNT(DISTINCT CASE WHEN p.Estatus = 'Pendiente' THEN p.NumeroPedido END) AS pendingOrders,
        COUNT(DISTINCT CASE WHEN p.Estatus = 'En Proceso' THEN p.NumeroPedido END) AS inProgressOrders,
        COUNT(DISTINCT CASE WHEN p.Estatus = 'Completado' THEN p.NumeroPedido END) AS completedOrders,
        COUNT(DISTINCT CASE WHEN p.Fecha_Compromiso < GETDATE() AND p.Fecha_Entrega IS NULL THEN p.NumeroPedido END) AS overdueOrders
      FROM Pedidos p
      INNER JOIN admAlmacenes a ON p.Origen = a.CIDALMACEN
      INNER JOIN UsuariosLocal u ON a.CNOMBREALMACEN = u.Clave
      WHERE a.CNOMBREALMACEN = @origen;
    `;

    console.log("Ejecutando query:", query); // Depuración

    const result = await pool.request().input('origen', sql.VarChar, origen).query(query);

    console.log("Resultado de la consulta:", result.recordset); // Depuración

    if (!result.recordset || !Array.isArray(result.recordset)) {
      return res.status(500).json({ message: 'Datos inválidos recibidos de la base de datos.' });
    }

    const metrics = result.recordset[0] || {
      totalOrders: 0,
      pendingOrders: 0,
      inProgressOrders: 0,
      completedOrders: 0,
      overdueOrders: 0,
    };

    console.log("Métricas enviadas al frontend:", metrics); // Depuración

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({ message: 'Error al obtener métricas', error });
  }
}
