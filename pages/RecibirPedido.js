import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import JsBarcode from 'jsbarcode';
import styles from './SurtirPedido.module.css';
import Navbar from './navbar';

const RecibirPedido = () => {
  const [codigoPedido, setCodigoPedido] = useState('');
  const [pedidoInfo, setPedidoInfo] = useState(null);
  const [productosEscaneados, setProductosEscaneados] = useState({});
  const [codigoManual, setCodigoManual] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [pedidoTerminado, setPedidoTerminado] = useState(false);
  const [autenticacionPendiente, setAutenticacionPendiente] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [productoActual, setProductoActual] = useState(null);
  const [escaneosRestantes, setEscaneosRestantes] = useState(0);
  const [loading, setLoading] = useState(false);

  // Buscar pedido en la base de datos
  const buscarPedido = async () => {
    if (!codigoPedido.trim()) {
      alert('⚠️ Ingresa un código de Traspaso válido.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/recibirPedido?numeroPedido=${codigoPedido}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Error al buscar el Traspaso');

      // Inicializar estado de productos
      const conteoInicial = {};
      data.productos.forEach(p => {
        conteoInicial[p.codigo] = 0;
      });

      setPedidoInfo({
        codigo: codigoPedido,
        pedido: {
          Origen: data.origen,
          Destino: data.destino
        },
        productos: data.productos.map(p => ({
          CCODIGOPRODUCTO: p.codigo,
          CNOMBREPRODUCTO: p.nombre,
          CUNIDADES: p.cantidad
        }))
      });
      
      setProductosEscaneados(conteoInicial);
      
      // Establecer el primer producto como actual
      if (data.productos.length > 0) {
        setProductoActual({
          CCODIGOPRODUCTO: data.productos[0].codigo,
          CNOMBREPRODUCTO: data.productos[0].nombre,
          CUNIDADES: data.productos[0].cantidad
        });
        setEscaneosRestantes(data.productos[0].cantidad);
      }

      setAutenticacionPendiente(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar producto escaneado
  const verificarProducto = async (codigoProducto) => {
    if (!pedidoInfo || !productoActual || autenticacionPendiente) return;
    
    // Limpiar código de posibles espacios
    codigoProducto = codigoProducto.trim();

    // Verificación local primero
    const productoEnPedido = pedidoInfo.productos.find(
      p => p.CCODIGOPRODUCTO === codigoProducto
    );

    if (!productoEnPedido) {
      alert(`⚠️ El producto ${codigoProducto} no está en este traspaso`);
      return;
    }

    // Verificar si es el producto actual
    if (codigoProducto !== productoActual.CCODIGOPRODUCTO) {
      alert(`⚠️ Debes escanear primero: ${productoActual.CNOMBREPRODUCTO} (${productoActual.CCODIGOPRODUCTO})`);
      return;
    }

    if (escaneosRestantes <= 0) {
      alert("⚠️ Ya completaste las unidades requeridas de este producto");
      return;
    }

    try {
      // Verificación en el servidor
      const response = await fetch(
        `/api/verificarProductoRecibido?numeroPedido=${codigoPedido}&codigoProducto=${codigoProducto}`
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en la respuesta del servidor");
      }

      // Actualizar conteo
      const nuevosEscaneos = {
        ...productosEscaneados,
        [codigoProducto]: (productosEscaneados[codigoProducto] || 0) + 1
      };
      
      setProductosEscaneados(nuevosEscaneos);
      setEscaneosRestantes(prev => prev - 1);

      // Verificar si completamos este producto
      if (nuevosEscaneos[codigoProducto] >= productoActual.CUNIDADES) {
        alert(`✅ Completado: ${productoActual.CNOMBREPRODUCTO}`);
        
        // Buscar siguiente producto pendiente
        const indexActual = pedidoInfo.productos.findIndex(
          p => p.CCODIGOPRODUCTO === productoActual.CCODIGOPRODUCTO
        );
        
        const siguienteProducto = pedidoInfo.productos.slice(indexActual + 1).find(p => {
          const escaneados = nuevosEscaneos[p.CCODIGOPRODUCTO] || 0;
          return escaneados < p.CUNIDADES;
        });

        if (siguienteProducto) {
          setProductoActual(siguienteProducto);
          setEscaneosRestantes(
            siguienteProducto.CUNIDADES - (nuevosEscaneos[siguienteProducto.CCODIGOPRODUCTO] || 0)
          );
        } else {
          const todosCompletados = pedidoInfo.productos.every(
            p => (nuevosEscaneos[p.CCODIGOPRODUCTO] || 0) >= p.CUNIDADES
          );
          
          if (todosCompletados) {
            alert("✅ Todos los productos han sido escaneados correctamente");
            setAutenticacionPendiente(true);
          }
        }
      }
    } catch (error) {
      console.error("Error en verificación:", error);
      alert("⚠️ Error de conexión, usando verificación local");
      
      // Actualizar conteo a pesar del error
      const nuevosEscaneos = {
        ...productosEscaneados,
        [codigoProducto]: (productosEscaneados[codigoProducto] || 0) + 1
      };
      
      setProductosEscaneados(nuevosEscaneos);
      setEscaneosRestantes(prev => prev - 1);
    }
  };

  const handleCodigoManual = (e) => {
    if (e.key === "Enter" && !autenticacionPendiente) {
      verificarProducto(codigoManual.trim());
      setCodigoManual("");
    }
  };

  const handleCodigoPedidoKeyDown = (e) => {
    if (e.key === "Enter") {
      buscarPedido();
    }
  };

  const validarYConfirmarRecepcion = async () => {
    if (!usuario || !password) {
      alert("Debe ingresar usuario y contraseña");
      return;
    }

    try {
      const res = await fetch(`/api/data?type=validarUsuario&usuario=${usuario}&contrasena=${password}`, {
        method: "GET"
      });

      if (!res.ok) throw new Error("Error en la validación");

      const data = await res.json();

      if (!data.valid) {
        throw new Error("Credenciales inválidas");
      }

      await confirmarRecepcion();
    } catch (error) {
      setMensajeError(error.message);
    }
  };

  const actualizarEstadoPedido = async (numeroPedido, nuevoEstado) => {
    try {
      const response = await fetch(`/api/actualizarEstadoPedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroPedido, nuevoEstado })
      });

      if (!response.ok) throw new Error("Error al actualizar estado");
      return await response.json();
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  const generarPDFDetallesPedido = async (numeroPedido, pedidoInfo) => {
    try {
      if (!pedidoInfo || !pedidoInfo.productos) {
        throw new Error("TraspasoInfo o productos no están definidos");
      }

      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([600, 800]);

      // Generar código de barras para el número de pedido
      const canvasPedido = document.createElement("canvas");
      JsBarcode(canvasPedido, numeroPedido, {
        format: "CODE128",
        displayValue: true,
        fontSize: 16,
        textMargin: 8,
      });

      // Convertir el código de barras a imagen
      const barcodeImage = canvasPedido.toDataURL("image/png");
      const barcodeEmbed = await pdfDoc.embedPng(barcodeImage);

      // Agregar título y código de barras al PDF
      page.drawText("Comprobante de Traspaso Recibido", { x: 50, y: 750, size: 18, color: rgb(0, 0, 0) });
      page.drawText(`Número de Traspaso: ${numeroPedido}`, { x: 50, y: 720, size: 10 });
      page.drawText(`Origen: ${pedidoInfo.pedido.Origen}`, { x: 50, y: 690, size: 10 });
      page.drawText(`Destino: ${pedidoInfo.pedido.Destino}`, { x: 50, y: 660, size: 10 });
      page.drawText(`Confirmado por: ${usuario}`, { x: 50, y: 630, size: 10 });

      // Insertar código de barras
      page.drawImage(barcodeEmbed, {
        x: 370,
        y: 700,
        width: 200,
        height: 50,
      });

      let currentY = 600;
      const lineHeight = 20;

      // Encabezados de tabla
      page.drawRectangle({ x: 40, y: currentY, width: 520, height: 20, color: rgb(0.8, 0.8, 0.8) });
      page.drawText("#", { x: 50, y: currentY + 5, size: 10 });
      page.drawText("Descripción", { x: 100, y: currentY + 5, size: 10 });
      page.drawText("Código", { x: 350, y: currentY + 5, size: 10 });
      page.drawText("Cantidad", { x: 500, y: currentY + 5, size: 10 });

      currentY -= lineHeight;
      let totalProductos = 0;

      // Productos
      pedidoInfo.productos.forEach((prod, index) => {
        totalProductos += parseInt(prod.CUNIDADES, 10);

        page.drawRectangle({ x: 40, y: currentY - 5, width: 520, height: 20, color: rgb(0.95, 0.95, 0.95) });
        page.drawText(`${index + 1}`, { x: 50, y: currentY, size: 10 });
        page.drawText(prod.CNOMBREPRODUCTO, { x: 100, y: currentY, size: 10 });
        page.drawText(prod.CCODIGOPRODUCTO, { x: 350, y: currentY, size: 10 });
        page.drawText(`${prod.CUNIDADES}`, { x: 520, y: currentY, size: 10 });

        currentY -= lineHeight;
      });

      currentY -= lineHeight;
      page.drawText(`Total Productos: ${totalProductos}`, { x: 50, y: currentY, size: 12 });

      // Guardar y descargar PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Comprobante_Traspaso_${numeroPedido}.pdf`;
      link.click();
    } catch (error) {
      console.error("Error al generar PDF:", error);
    }
  };

  const generarPDFCodigosBarras = async (numeroPedido, pedidoInfo) => {
    try {
      if (!pedidoInfo || !pedidoInfo.productos) {
        throw new Error("No hay información de productos");
      }

      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([600, 800]);

      let yPos = 700;
      const barWidth = 300;
      const barHeight = 80;
      const spaceY = 150;

      page.drawText(`Códigos de Barras - Traspaso ${numeroPedido}`, { 
        x: 50, y: 750, size: 16, color: rgb(0, 0, 0) 
      });

      for (const prod of pedidoInfo.productos) {
        const codigoBarras = prod.CCODIGOPRODUCTO;

        const canvas = document.createElement("canvas");
        JsBarcode(canvas, codigoBarras, {
          format: "CODE128",
          displayValue: true,
          fontSize: 16,
          textMargin: 8,
        });

        const barcodeImage = canvas.toDataURL("image/png");
        const barcodeEmbed = await pdfDoc.embedPng(barcodeImage);

        page.drawText(`Producto: ${prod.CNOMBREPRODUCTO}`, { x: 50, y: yPos + 40, size: 12 });
        page.drawText(`Código: ${codigoBarras}`, { x: 50, y: yPos + 20, size: 12 });

        page.drawImage(barcodeEmbed, {
          x: 150,
          y: yPos - 40,
          width: barWidth,
          height: barHeight,
        });

        yPos -= spaceY;

        if (yPos < 100) {
          page = pdfDoc.addPage([600, 800]);
          yPos = 700;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Codigos_Barras_Traspaso_${numeroPedido}.pdf`;
      link.click();
    } catch (error) {
      console.error("Error al generar PDF de códigos:", error);
    }
  };

  const confirmarRecepcion = async () => {
    try {
      // Generar documentos PDF
      await generarPDFDetallesPedido(codigoPedido, pedidoInfo);
      await generarPDFCodigosBarras(codigoPedido, pedidoInfo);
      
      // Actualizar estado del pedido a "Recibido"
      await actualizarEstadoPedido(codigoPedido, "Recibido");

      // Actualizar almacén destino
      const updateResponse = await fetch('/api/Almacen_destino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          numeroPedido: codigoPedido, 
          destino: pedidoInfo.pedido.Destino 
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error al actualizar el almacén destino');
      }

      alert('✅ Traspaso recibido correctamente');
      
      // Resetear estado
      setCodigoPedido("");
      setPedidoInfo(null);
      setProductosEscaneados({});
      setCodigoManual("");
      setUsuario("");
      setPassword("");
      setAutenticacionPendiente(false);
      setProductoActual(null);
      setEscaneosRestantes(0);
      setPedidoTerminado(true);
    } catch (error) {
      console.error("Error al confirmar recepción:", error);
      alert("Error al confirmar la recepción del traspaso");
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.panelContainer}>
        <h3 className={styles.panelTitle}>Panel de Recepción de Traspaso</h3>

        {!pedidoInfo ? (
          <div>
            <h4>Ingresa o Escanea el Código del Traspaso</h4>
            <input
              className={styles.input}
              type="text"
              placeholder="Código de Traspaso"
              value={codigoPedido}
              onChange={(e) => setCodigoPedido(e.target.value)}
              onKeyDown={handleCodigoPedidoKeyDown}
            />
            <button className={styles.button} onClick={buscarPedido} disabled={loading}>
              {loading ? "Buscando..." : "Buscar Traspaso"}
            </button>
          </div>
        ) : (
          <div>
            <h4 className={styles.panelTitle}>Traspaso: {pedidoInfo.codigo}</h4>
            <div className={styles.pedidoInfo}>
              <p><strong>Origen:</strong> {pedidoInfo.pedido.Origen}</p>
              <p><strong>Destino:</strong> {pedidoInfo.pedido.Destino}</p>
            </div>
            
            {productoActual && (
              <div className={styles.productoActual}>
                <h4>Producto actual:</h4>
                <p><strong>Nombre:</strong> {productoActual.CNOMBREPRODUCTO}</p>
                <p><strong>Código:</strong> {productoActual.CCODIGOPRODUCTO}</p>
                <p><strong>Escaneados:</strong> {productosEscaneados[productoActual.CCODIGOPRODUCTO] || 0} de {productoActual.CUNIDADES}</p>
              </div>
            )}
            
            <div className={styles.columnsContainer}>
              <div className={styles.column}>
                <h3>Productos</h3>
                <ul>
                  {pedidoInfo.productos.map((producto, index) => (
                    <li 
                      key={index} 
                      className={producto.CCODIGOPRODUCTO === productoActual?.CCODIGOPRODUCTO ? styles.productoActualLi : ''}
                    >
                      {producto.CNOMBREPRODUCTO}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.column}>
                <h3>Cantidad</h3>
                <ul>
                  {pedidoInfo.productos.map((producto, index) => (
                    <li key={index}>{producto.CUNIDADES}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.column}>
                <h3>Escaneados</h3>
                <ul>
                  {pedidoInfo.productos.map((producto, index) => (
                    <li key={index}>
                      {productosEscaneados[producto.CCODIGOPRODUCTO] || 0}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {!pedidoTerminado && !autenticacionPendiente && (
              <div className={styles.escaneoContainer}>
                <h5>Escanea el producto actual:</h5>
                <input
                  className={styles.input}
                  type="text"
                  placeholder={`Ingrese código: ${productoActual?.CCODIGOPRODUCTO || ''}`}
                  value={codigoManual}
                  onChange={(e) => setCodigoManual(e.target.value)}
                  onKeyDown={handleCodigoManual}
                  autoFocus
                />
              </div>
            )}

            {autenticacionPendiente && (
              <div className={styles.authContainer}>
                <h4>Confirmación de Recepción</h4>
                <p>Ingrese sus credenciales para finalizar el proceso</p>
                
                <div className={styles.inputGroup}>
                  <label>Usuario:</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Contraseña:</label>
                  <input
                    className={styles.input}
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {mensajeError && <p className={styles.errorMessage}>{mensajeError}</p>}
                
                <button 
                  className={styles.button} 
                  onClick={validarYConfirmarRecepcion} 
                  disabled={loading}
                >
                  {loading ? "Validando..." : "Confirmar Recepción"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecibirPedido;