import { connectToDatabase, sql } from '../../dbconfig';

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    // Aceptamos múltiples nombres de parámetro para mayor flexibilidad
    const numeroPedido = req.query.pedidoId || req.query.numeroPedido || req.query.id;

    if (!numeroPedido) {
      return res.status(400).json({ 
        success: false,
        message: 'Número de traspaso es requerido',
        suggestion: 'Use el parámetro pedidoId o numeroPedido en la URL'
      });
    }

    try {
      const pool = await connectToDatabase();

      // 1. Obtener datos básicos del traspaso
      const pedidoResult = await pool.request()
        .input('numeroPedido', sql.NVarChar, numeroPedido)
        .query(`
          SELECT 
            NumeroPedido,
            Origen,
            Destino,
            Estatus
          FROM Pedidos 
          WHERE NumeroPedido = @numeroPedido
        `);

      if (pedidoResult.recordset.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: `Traspaso ${numeroPedido} no encontrado`
        });
      }

      const pedido = pedidoResult.recordset[0];

      // 2. Verificar si el traspaso ya fue recibido
      if (pedido.Estatus === 'Recibido') {
        return res.status(200).json({
          success: true,
          message: 'Traspaso ya recibido',
          recibido: true,
          numeroPedido: pedido.NumeroPedido
        });
      }

      // 3. Obtener nombres de almacenes
      const [origenResult, destinoResult] = await Promise.all([
        pool.request()
          .input('codigoAlmacen', sql.VarChar, pedido.Origen)
          .query('SELECT CNOMBREALMACEN FROM admAlmacenes WHERE CCODIGOALMACEN = @codigoAlmacen'),
        pool.request()
          .input('codigoAlmacen', sql.VarChar, pedido.Destino)
          .query('SELECT CNOMBREALMACEN FROM admAlmacenes WHERE CCODIGOALMACEN = @codigoAlmacen')
      ]);

      // 4. Obtener productos del traspaso
      const productosResult = await pool.request()
        .input('numeroPedido', sql.NVarChar, numeroPedido)
        .query(`
          SELECT 
            p.Producto AS CIDPRODUCTO,
            p.Unidades,
            prod.CCODIGOPRODUCTO,
            prod.CNOMBREPRODUCTO
          FROM Pedidos p
          JOIN admProductos prod ON p.Producto = prod.CIDPRODUCTO
          WHERE p.NumeroPedido = @numeroPedido
        `);

      return res.status(200).json({
        success: true,
        numeroPedido: pedido.NumeroPedido,
        origen: origenResult.recordset[0]?.CNOMBREALMACEN || pedido.Origen,
        destino: destinoResult.recordset[0]?.CNOMBREALMACEN || pedido.Destino,
        productos: productosResult.recordset.map(p => ({
          codigo: p.CCODIGOPRODUCTO,
          nombre: p.CNOMBREPRODUCTO,
          cantidad: p.Unidades
        })),
        recibido: false
      });

    } catch (err) {
      console.error('Error al obtener traspaso:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Error al procesar la solicitud',
        error: err.message
      });
    }
  }
  else if (method === 'POST') {
    // Lógica para confirmar recepción
    const { pedidoId, usuario, password } = req.body;

    if (!pedidoId || !usuario || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos incompletos (se requieren pedidoId, usuario y password)'
      });
    }

    try {
      const pool = await connectToDatabase();

      // 1. Validar usuario
      const usuarioResult = await pool.request()
        .input('usuario', sql.NVarChar, usuario)
        .input('password', sql.NVarChar, password)
        .query(`
          SELECT CIDUSUARIO, CNOMBREUSUARIO 
          FROM admUsuarios 
          WHERE CUSUARIO = @usuario AND CCONTRASENA = @password
        `);

      if (usuarioResult.recordset.length === 0) {
        return res.status(401).json({ 
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // 2. Actualizar estado del traspaso
      const updateResult = await pool.request()
        .input('numeroPedido', sql.NVarChar, pedidoId)
        .input('usuarioId', sql.Int, usuarioResult.recordset[0].CIDUSUARIO)
        .query(`
          UPDATE Pedidos 
          SET 
            Estatus = 'Recibido',
            FechaRecepcion = GETDATE(),
            RecibidoPor = @usuarioId
          WHERE NumeroPedido = @numeroPedido
        `);

      if (updateResult.rowsAffected[0] === 0) {
        return res.status(404).json({ 
          success: false,
          message: `Traspaso ${pedidoId} no encontrado`
        });
      }

      return res.status(200).json({ 
        success: true,
        message: 'Traspaso recibido correctamente',
        numeroPedido: pedidoId,
        recibidoPor: usuarioResult.recordset[0].CNOMBREUSUARIO,
        fechaRecepcion: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error al confirmar recepción:', err);
      return res.status(500).json({ 
        success: false,
        message: 'Error al confirmar recepción',
        error: err.message
      });
    }
  }
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: `Método ${method} no permitido`
    });
  }
}