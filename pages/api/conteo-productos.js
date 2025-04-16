import { connectToDatabase, sql } from '../../dbconfig';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { NombreInventario, Usuario, InventarioID, ProductoID, Unidades } = req.body;

    try {
      const pool = await connectToDatabase();

      if (NombreInventario && Usuario) {
        // Insertar un nuevo inventario
        await pool.request()
          .input('NombreInventario', sql.NVarChar, NombreInventario)
          .input('Usuario', sql.NVarChar, Usuario)
          .query(
            `INSERT INTO Inventarios (NombreInventario, Usuario, FechaCreacion)
            VALUES (@NombreInventario, @Usuario, GETDATE());`
          );
        return res.status(200).json({ success: true, message: 'Inventario creado exitosamente' });
      }

      if (InventarioID && ProductoID && Unidades) {
        // Insertar el producto escaneado
        await pool.request()
          .input('InventarioID', sql.Int, InventarioID)
          .input('ProductoID', sql.Int, ProductoID)
          .input('Unidades', sql.Int, Unidades)
          .query(
            `INSERT INTO InventarioDetalle (InventarioID, ProductoID, Unidades)
            VALUES (@InventarioID, @ProductoID, @Unidades);`
          );
        return res.status(200).json({ success: true, message: 'Producto registrado exitosamente' });
      }

      return res.status(400).json({ message: 'Faltan datos necesarios' });
    } catch (error) {
      console.error('Error en la operación:', error);
      return res.status(500).json({ message: 'Error en la operación', error });
    }
  }

  if (req.method === 'GET') {
    const { InventarioID } = req.query;

    if (!InventarioID) {
      return res.status(400).json({ message: 'Falta el ID del inventario' });
    }

    try {
      const pool = await connectToDatabase();
      const result = await pool.request()
        .input('InventarioID', sql.Int, InventarioID)
        .query(
          `SELECT P.CCODIGOPRODUCTO, P.CNOMBREPRODUCTO, SUM(ID.Unidades) AS TotalUnidades
          FROM InventarioDetalle ID
          INNER JOIN admProductos P ON ID.ProductoID = P.CIDPRODUCTO
          WHERE ID.InventarioID = @InventarioID
          GROUP BY P.CCODIGOPRODUCTO, P.CNOMBREPRODUCTO;`
        );
      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error('Error al obtener el conteo de productos:', error);
      return res.status(500).json({ message: 'Error al obtener el conteo de productos', error });
    }
  }

  res.setHeader('Allow', ['POST', 'GET']);
  res.status(405).end(`Método ${req.method} no permitido`);
}