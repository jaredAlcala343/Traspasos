import { connectToDatabase, sql } from "../../dbconfig";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { inventarios, usuario, contrasena } = req.body;

  try {
    console.log("🔄 Conectando a la base de datos...");
    const pool = await connectToDatabase();

    for (const producto of inventarios) {
      console.log(`📦 Actualizando producto: ${producto.CCODIGOPRODUCTO}`);
      await pool.request()
        .input("CCODIGOPRODUCTO", sql.VarChar, producto.CCODIGOPRODUCTO)
        .input("EXISTENCIA_TOTAL_PRODUCTO", sql.Int, producto.EXISTENCIA_TOTAL_PRODUCTO)
        .input("fechaInventario", sql.DateTime, new Date())
        .query(`
          UPDATE inventarios
          SET EXISTENCIA_TOTAL_PRODUCTO = @EXISTENCIA_TOTAL_PRODUCTO,
              fechaInventario = @fechaInventario
          WHERE CCODIGOPRODUCTO = @CCODIGOPRODUCTO;
        `);
    }

    console.log("📧 Enviando correo de confirmación...");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'gerente@example.com, jefes@example.com',
      subject: 'Inventario Completado Sin Discrepancias',
      text: `Usuario: ${usuario}\nContraseña: ${contrasena}\nInventario actualizado sin discrepancias.`,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ Inventario actualizado y correo enviado");
    res.status(200).json({ message: "Inventario actualizado y correo enviado" });
  } catch (error) {
    console.error("❌ Error al actualizar el inventario:", error);
    res.status(500).json({ error: "Error al actualizar el inventario" });
  }
}
