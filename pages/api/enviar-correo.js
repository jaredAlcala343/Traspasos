import nodemailer from "nodemailer";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import { connectToDatabase, sql } from "../../dbconfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  console.log("📩 Recibiendo datos para enviar correo:", req.body);

  try {
    let { Origen, Destino, NumeroPedido } = req.body;

    Origen = Origen.toString();
    Destino = Destino.toString();

    if (!Origen || !Destino || !NumeroPedido) {
      console.error("❌ Datos inválidos:", { Origen, Destino, NumeroPedido });
      return res.status(400).json({ message: "Datos inválidos en la petición" });
    }

    const pool = await connectToDatabase();

    // 1. Obtener productos del pedido con código
    const productosResult = await pool.request()
      .input("NumeroPedido", sql.VarChar, NumeroPedido)
      .query(`
        SELECT 
          p.Producto AS CIDPRODUCTO,
          p.Unidades,
          pr.CCODIGOPRODUCTO
        FROM Pedidos p
        JOIN admProductos pr ON p.Producto = pr.CIDPRODUCTO
        WHERE p.NumeroPedido = @NumeroPedido
      `);

    if (productosResult.recordset.length === 0) {
      return res.status(404).json({ message: "No se encontraron productos para el pedido." });
    }

    const productos = productosResult.recordset;

    // 2. Obtener correo y nombres de almacenes
    const userResult = await pool
      .request()
      .input("Origen", sql.VarChar, Origen)
      .input("Destino", sql.VarChar, Destino)
      .query(`
        SELECT DISTINCT u.Correo, 
                        a_origen.CNOMBREALMACEN AS NombreAlmacenOrigen, 
                        a_destino.CNOMBREALMACEN AS NombreAlmacenDestino 
        FROM UsuariosLocal AS u
        JOIN admAlmacenes AS a_origen ON a_origen.CCODIGOALMACEN = @Origen
        JOIN admAlmacenes AS a_destino ON a_destino.CCODIGOALMACEN = @Destino
        WHERE u.Clave = a_origen.CNOMBREALMACEN 
          AND u.Correo IS NOT NULL;
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "No se encontró usuario con correo para el almacén." });
    }

    const { Correo, NombreAlmacenOrigen, NombreAlmacenDestino } = userResult.recordset[0];

    // 3. Generar código de barras
    let barcodeImage = "";
    try {
      const canvas = createCanvas(200, 50);
      JsBarcode(canvas, NumeroPedido, { format: "CODE128", displayValue: true, fontSize: 14, textMargin: 4 });
      barcodeImage = canvas.toDataURL();
    } catch (err) {
      console.error("⚠️ Error generando código de barras:", err);
    }

    // 4. Crear HTML de productos
    const productosHTML = productos.map(
      (prod) =>
        `<li><strong>${prod.CCODIGOPRODUCTO}</strong> - ${prod.Unidades} unidades</li>`
    ).join("");

    // 5. Preparar correo
    const mailOptions = {
      from: `"Sistema de Traspasos" <${process.env.EMAIL_USER}>`,
      to: Correo,
      subject: `Orden de Surtir Traspaso - ${NumeroPedido}`,
      html: `
        <h1>Orden de Surtir Traspaso</h1>
        <p><strong>Origen:</strong> ${NombreAlmacenOrigen}</p>
        <p><strong>Destino:</strong> ${NombreAlmacenDestino}</p>
        <p><strong>Número de Traspaso:</strong> ${NumeroPedido}</p>
        <h2>Productos</h2>
        <ul>${productosHTML}</ul>
        ${barcodeImage ? `<p><strong>Código de Barras del Traspaso:</strong></p><img src="${barcodeImage}" alt="Código de Barras">` : ""}
      `,
    };

    // 6. Enviar correo
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado a ${Correo} (${info.messageId})`);

    // 7. Actualizar almacén
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const updateResponse = await fetch(`${apiUrl}/api/Actualizar-almacen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ NumeroPedido })
    });

    const updateResult = await updateResponse.json();
    console.log("📦 Resultado de la actualización de almacén:", updateResult);

    return res.status(200).json({ message: "Correo enviado y almacén actualizado" });
  } catch (error) {
    console.error("❌ Error en el envío de correo:", error);
    return res.status(500).json({ message: "Error interno", error: error.message });
  }
}
