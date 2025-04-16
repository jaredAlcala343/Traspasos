import { connectToDatabase, sql } from "../../dbconfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { numeroPedido } = req.body;

  if (!numeroPedido) {
    return res.status(400).json({ message: "Número de pedido es requerido." });
  }

  try {
    console.log("🔄 Conectando a la base de datos...");
    const pool = await connectToDatabase();

    // 1. Obtener el destino desde la tabla Pedidos
    const pedidoRes = await pool.request()
  .input("NumeroPedido", sql.VarChar, numeroPedido)
  .query(`SELECT TOP 1 a.CIDALMACEN FROM Pedidos AS p, admAlmacenes as a WHERE NumeroPedido = @NumeroPedido and a.CCODIGOALMACEN = p.Destino`);

    if (pedidoRes.recordset.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    const destinoID = pedidoRes.recordset[0].CIDALMACEN; // 👈 CAMBIO AQUÍ


    // 2. Obtener el CIDDOCUMENTO relacionado al pedido (CFOLIO)
    const docRes = await pool.request()
      .input("CFOLIO", sql.VarChar, numeroPedido)
      .query(`
        SELECT TOP 1 CIDDOCUMENTO 
        FROM admDocumentos 
        WHERE CFOLIO = @CFOLIO AND CIDDOCUMENTODE = 34 
        ORDER BY CIDDOCUMENTO DESC
      `);

    if (docRes.recordset.length === 0) {
      return res.status(404).json({ message: "Documento no encontrado para este pedido." });
    }

    const documentoID = docRes.recordset[0].CIDDOCUMENTO;
    console.log(`📄 Documento relacionado encontrado: CIDDOCUMENTO = ${documentoID}`);

    // 3. Obtener todos los movimientos ordenados por CIDMOVIMIENTO
    const movimientosRes = await pool.request().query(`
      SELECT CIDMOVIMIENTO, CIDDOCUMENTO, CIDALMACEN
      FROM admMovimientos
      WHERE CIDDOCUMENTODE = 34
      ORDER BY CIDMOVIMIENTO ASC;
    `);

    const movimientos = movimientosRes.recordset;
    const actualizados = [];

    let enRango = false;

    for (const mov of movimientos) {
      const { CIDMOVIMIENTO, CIDDOCUMENTO, CIDALMACEN } = mov;

      // Iniciamos cuando aparece el documento objetivo
      if (CIDDOCUMENTO === documentoID) {
        enRango = true;
      }

      // Si estamos dentro del bloque de traspaso del documento objetivo
      if (enRango) {
        if (CIDDOCUMENTO === documentoID || CIDDOCUMENTO === 0) {
          if (CIDALMACEN === 21) {
            await pool.request()
              .input("CIDMOVIMIENTO", sql.Int, CIDMOVIMIENTO)
              .input("CIDALMACEN", sql.Int, destinoID)
              .query(`
                UPDATE admMovimientos
                SET CIDALMACEN = @CIDALMACEN
                WHERE CIDMOVIMIENTO = @CIDMOVIMIENTO;
              `);
            console.log(`✅ Movimiento ${CIDMOVIMIENTO} actualizado de almacén 21 a ${destinoID}`);
            actualizados.push(CIDMOVIMIENTO);
          } else {
            console.log(`✔️ Movimiento ${CIDMOVIMIENTO} ya tiene almacén correcto (${CIDALMACEN})`);
          }
        } else {
          console.log(`⛔ Se encontró CIDDOCUMENTO diferente (${CIDDOCUMENTO}), fin del bloque.`);
          break; // Salimos del bucle al detectar otro documento
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: actualizados.length
        ? `Se actualizaron ${actualizados.length} movimientos.`
        : "No se realizaron cambios. Todos los movimientos ya estaban correctos.",
      actualizados,
    });

  } catch (error) {
    console.error("❌ Error al actualizar movimientos:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno.",
      error: error.message,
    });
  }
}
