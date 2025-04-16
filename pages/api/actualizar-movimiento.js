import { connectToDatabase, sql } from "../../dbconfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { NumeroPedido } = req.body;
  const NuevoAlmacen = 21; // Almacén virtual

  if (!NumeroPedido) {
    return res.status(400).json({ message: "Falta el número de pedido" });
  }

  try {
    const pool = await connectToDatabase();

    // Verificar si el pedido existe y su estado
    const pedido = await pool
      .request()
      .input("NumeroPedido", sql.NVarChar, String(NumeroPedido))
      .query(
        `SELECT Estatus, Destino 
         FROM Pedidos 
         WHERE NumeroPedido = @NumeroPedido`
      );

    if (pedido.recordset.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const { Estatus, Destino } = pedido.recordset[0];

    // Si ya fue entregado o ya está en el almacén virtual, no se actualiza
    if (Estatus === "Entregado" || Destino === NuevoAlmacen) {
      return res.status(400).json({ message: "Pedido ya entregado o almacén ya actualizado" });
    }

    // Actualizar el almacén de destino a 21
    await pool
      .request()
      .input("NumeroPedido", sql.NVarChar, String(NumeroPedido))
      .input("NuevoAlmacen", sql.Int, NuevoAlmacen)
      .query(
        `UPDATE Pedidos 
         SET Destino = @NuevoAlmacen 
         WHERE NumeroPedido = @NumeroPedido`
      );

    console.log(`✅ Almacén actualizado a ${NuevoAlmacen} para el pedido ${NumeroPedido}`);

    res.status(200).json({ success: true, message: `Almacén actualizado a ${NuevoAlmacen}` });

  } catch (error) {
    console.error("❌ Error al actualizar el almacén:", error);
    res.status(500).json({ message: "Error al actualizar el almacén", error });
  }
}
