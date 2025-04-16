import { getPool, sql } from "../../dbconfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  try {
    const { numeroPedido } = req.body;

    if (!numeroPedido) {
      return res.status(400).json({ message: "Número de pedido requerido" });
    }

    const pool = await getPool();
    
    const result = await pool.request()
      .input("numeroPedido", sql.VarChar, numeroPedido)
      .query(`
        UPDATE pedidos 
        SET Estatus = 'Completado'
        WHERE NumeroPedido = @numeroPedido;
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    return res.status(200).json({ message: "Pedido actualizado a 'Completado'" });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}
