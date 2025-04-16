import { connectToDatabase, sql } from "../../dbconfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    console.log("🔄 Conectando a la base de datos...");
    const pool = await connectToDatabase();

    // 1. Obtener el CIDDOCUMENTO más reciente con CIDDOCUMENTODE = 34
    console.log("📌 Buscando el documento más reciente...");
    const docResult = await pool.request().query(`
      SELECT TOP 1 CIDDOCUMENTO 
      FROM admMovimientos
      WHERE CIDDOCUMENTODE = 34
      ORDER BY CIDDOCUMENTO DESC;
    `);

    if (docResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "No se encontraron movimientos para actualizar." });
    }

    const CIDDOCUMENTO_REF = docResult.recordset[0].CIDDOCUMENTO;
    console.log(`📋 Documento referencia: CIDDOCUMENTO = ${CIDDOCUMENTO_REF}`);

    // 2. Obtener el CIDMOVIMIENTO de inicio para ese documento
    const movInicio = await pool.request()
      .input("CIDDOCUMENTO", sql.Int, CIDDOCUMENTO_REF)
      .query(`
        SELECT MIN(CIDMOVIMIENTO) AS CIDMOVIMIENTO_INICIO, MAX(CIDALMACEN) AS CIDALMACEN
        FROM admMovimientos
        WHERE CIDDOCUMENTO = @CIDDOCUMENTO;
      `);

    const { CIDMOVIMIENTO_INICIO, CIDALMACEN } = movInicio.recordset[0];
    console.log(`🔍 Inicio desde CIDMOVIMIENTO = ${CIDMOVIMIENTO_INICIO}, Almacén actual: ${CIDALMACEN}`);

    // 3. Obtener todos los movimientos siguientes desde el inicio
    const movimientos = await pool.request().query(`
      SELECT CIDMOVIMIENTO, CIDDOCUMENTO, CIDALMACEN
      FROM admMovimientos
      WHERE CIDMOVIMIENTO >= ${CIDMOVIMIENTO_INICIO}
      ORDER BY CIDMOVIMIENTO ASC;
    `);

    const actualizados = [];

    for (let movimiento of movimientos.recordset) {
      const { CIDMOVIMIENTO, CIDDOCUMENTO, CIDALMACEN: ALMACEN_ACTUAL } = movimiento;

      if (CIDDOCUMENTO > CIDDOCUMENTO_REF) {
        console.log(`🚫 Se encontró un documento mayor (${CIDDOCUMENTO}) al de referencia (${CIDDOCUMENTO_REF}). Deteniendo actualización.`);
        break;
      }

      if (ALMACEN_ACTUAL !== CIDALMACEN) {
        console.log(`🔄 Actualizando almacén del movimiento ${CIDMOVIMIENTO} a 21...`);
        await pool.request()
          .input("CIDMOVIMIENTO", sql.Int, CIDMOVIMIENTO)
          .query(`
            UPDATE admMovimientos
            SET CIDALMACEN = 21
            WHERE CIDMOVIMIENTO = @CIDMOVIMIENTO;
          `);
        actualizados.push(CIDMOVIMIENTO);
        console.log(`✅ Movimiento ${CIDMOVIMIENTO} actualizado.`);
      }
    }

    if (actualizados.length > 0) {
      return res.status(200).json({
        success: true,
        message: `Se actualizaron ${actualizados.length} movimientos.`,
        actualizados,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "No se realizaron cambios, todos los almacenes ya estaban correctos.",
      });
    }

  } catch (error) {
    console.error("❌ Error al actualizar los movimientos:", error);
    return res.status(500).json({
      message: "Error interno al actualizar los movimientos",
      error: error.message,
    });
  }
}
