import { getPool, sql } from "../../dbconfig"; // Importar la función correcta

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { numeroPedido, nuevoEstado } = req.body;

    if (!numeroPedido || !nuevoEstado) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    // Obtener la conexión a la base de datos correctamente
    const pool = await getPool();
    
    if (!pool) {
      throw new Error("La conexión a la base de datos no está disponible.");
    }

    const query = `
      UPDATE pedidos 
      SET Estatus = ?
      WHERE NumeroPedido = ?;
    `;
    const values = [nuevoEstado, numeroPedido];

    const result = await pool.request()
      .input("nuevoEstado", sql.VarChar, nuevoEstado)
      .input("numeroPedido", sql.VarChar, numeroPedido)
      .query(`
        UPDATE pedidos 
        SET Estatus = @nuevoEstado
        WHERE NumeroPedido = @numeroPedido;
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    return res.status(200).json({ message: "Estado actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
