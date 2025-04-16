import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { discrepancias, usuario, contrasena, almacen, fecha } = req.body;

    // Crear el documento PDF
    const doc = new PDFDocument({ margin: 30 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Configurar el transporte de correo
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Configurar el contenido del correo
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'jalcalaing@gmail.com, f1.alcala.alvarado.jared@gmail.com', // Cambia esto por las direcciones de correo reales
        subject: 'Reporte de Discrepancias en Inventario',
        text: `Usuario: ${usuario}\nContraseña: ${contrasena}\nAdjunto encontrarás el reporte de discrepancias en formato PDF.`,
        attachments: [
          {
            filename: 'reporte_discrepancias.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      try {
        // Enviar el correo
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Reporte de discrepancias enviado' });
      } catch (error) {
        console.error('Error al enviar el correo:', error);
        res.status(500).json({ error: 'Error al enviar el correo' });
      }
    });

    // Función para dibujar encabezados de la tabla
    const drawTableHeaders = (doc, y) => {
      doc.fontSize(10);
      doc.fillColor('#cccccc').rect(15, y - 10, 570, 20).fill();
      doc.fillColor('#000000');
      doc.text('ID Producto', 55, y);
      doc.text('Nombre Producto', 150, y);
      doc.text('Existencia Total', 416, y);
      doc.text('Conteo Real', 510, y);
    };

    // Agregar contenido al PDF
    doc.fontSize(20).text('Reporte de Discrepancias en Inventario', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Almacén: ${almacen}`);
    doc.text(`Fecha: ${fecha}`);
    doc.moveDown();
    doc.fontSize(12).text('Discrepancias:', { underline: true });
    doc.moveDown();

    // Agregar tabla de discrepancias
    let y = 170;
    drawTableHeaders(doc, y);
    y += 20;

    discrepancias.forEach((producto, index) => {
      if (y > doc.page.height - 50) {
        doc.addPage();
        y = 50;
        drawTableHeaders(doc, y);
        y += 20;
      }
      const fillColor = index % 2 === 0 ? '#ffffff' : '#f2f2f2';
      doc.fillColor(fillColor).rect(15, y - 10, 570, 20).fill();
      doc.fillColor('#000000');
      doc.text(producto.CCODIGOPRODUCTO, 20, y);
      doc.text(producto.CNOMBREPRODUCTO, 110, y, { width: 300, ellipsis: true });
      doc.text(producto.EXISTENCIA_TOTAL_PRODUCTO, 426, y);
      doc.text(producto.conteoReal, 510, y);
      y += 20;
    });

    doc.end();
  } else {
    res.status(405).json({ error: 'Método no permitido' });
  }
}