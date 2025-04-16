import React, { useState, useEffect } from "react";
import styles from "./EntregaDomicilio.module.css";
import Navbar from "./navbar";
import * as XLSX from 'xlsx'; // Para generar archivos Excel
import { useRouter } from 'next/router'; 

const Inventario = () => {
  const [almacenes, setAlmacenes] = useState([]);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState("");
  const [inventarios, setInventarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 30;
  const router = useRouter();

  // Obtener lista de almacenes
  const obtenerAlmacenes = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/almacenes");
      if (!res.ok) {
        alert("Error al obtener los almacenes");
        return;
      }

      const data = await res.json();
      setAlmacenes(data);
    } catch (error) {
      console.error("Error al obtener almacenes:", error);
      alert("Hubo un error al obtener los almacenes");
    } finally {
      setCargando(false);
    }
  };

  // Obtener inventario de un almacén
  const obtenerInventarioPorAlmacen = async () => {
    if (!almacenSeleccionado) return;

    setCargando(true);
    try {
      const res = await fetch(`/api/inventarios?almacenID=${almacenSeleccionado}`);
      if (!res.ok) {
        alert("Error al obtener el inventario");
        return;
      }

      const data = await res.json();
      setInventarios(data);
    } catch (error) {
      console.error("Error al obtener inventario:", error);
      alert("Hubo un error al obtener el inventario");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerAlmacenes();
  }, []);

  useEffect(() => {
    obtenerInventarioPorAlmacen();
  }, [almacenSeleccionado]);

  // Calcular los items a mostrar en la página actual
  const indexUltimoItem = paginaActual * itemsPorPagina;
  const indexPrimerItem = indexUltimoItem - itemsPorPagina;
  const itemsActuales = inventarios.slice(indexPrimerItem, indexUltimoItem);

  // Cambiar de página
  const cambiarPagina = (numeroPagina) => setPaginaActual(numeroPagina);

  // Calcular el número total de páginas
  const numeroTotalPaginas = Math.ceil(inventarios.length / itemsPorPagina);

  // Generar botones de paginación
  const renderizarBotonesPaginacion = () => {
    const botones = [];
    for (let i = 1; i <= numeroTotalPaginas; i++) {
      if (i === 1 || i === numeroTotalPaginas || (i >= paginaActual - 2 && i <= paginaActual + 2)) {
        botones.push(
          <button
            key={i}
            onClick={() => cambiarPagina(i)}
            className={paginaActual === i ? styles.active : ""}
          >
            {i}
          </button>
        );
      } else if (i === 2 || i === numeroTotalPaginas - 1) {
        botones.push(<span key={i}>...</span>);
      }
    }
    return botones;
  };

  // Descargar inventario como Excel con tabla dinámica
  const descargarInventario = () => {
    const ws = XLSX.utils.json_to_sheet(inventarios, { header: ["CCODIGOPRODUCTO", "CNOMBREPRODUCTO", "EXISTENCIA_TOTAL_PRODUCTO"] }); // Descargar todo el inventario
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    // Crear la tabla dinámica
    const pivotTable = XLSX.utils.aoa_to_sheet([
      ["", "", "", "Pivot Table"],
      ["", "", "", "Sum of EXISTENCIA_TOTAL_PRODUCTO"],
      ["", "CCODIGOPRODUCTO", "CNOMBREPRODUCTO", "Values"],
      ["", "CCODIGOPRODUCTO", "CNOMBREPRODUCTO", "EXISTENCIA_TOTAL_PRODUCTO"],
      ["", "CCODIGOPRODUCTO", "CNOMBREPRODUCTO", "EXISTENCIA_TOTAL_PRODUCTO"]
    ]);

    XLSX.utils.book_append_sheet(wb, pivotTable, "Tabla Dinámica");

    XLSX.writeFile(wb, "inventario.xlsx");
  };

  // Realizar auditoría de inventario
  const realizarAuditoria = () => {
    router.push('/auditoria-inventario');
  };

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Gestión de Inventarios</h1>

        {/* Selección de Almacén */}
        <div className={styles.panelContainer}>
          <h2>Seleccionar Almacén</h2>
          <select
            value={almacenSeleccionado}
            onChange={(e) => setAlmacenSeleccionado(e.target.value)}
          >
            <option value="">Selecciona un almacén</option>
            {almacenes.map((almacen) => (
              <option key={almacen.CIDALMACEN} value={almacen.CIDALMACEN}>
                {almacen.CNOMBREALMACEN}
              </option>
            ))}
          </select>
          <div className={styles.buttons1y2}>
            <button 
              onClick={descargarInventario} 
              className={styles.Inventario}
              disabled={!almacenSeleccionado} // Deshabilitar si no hay almacén seleccionado
            >
              Descargar Inventario
            </button>
            <button onClick={realizarAuditoria} className={styles.Auditoria}>
              Auditoría de Inventario
            </button>
          </div>
        </div>

        {/* Inventario por Almacén */}
        <div className={styles.panelContainer}>
          <h2>Inventario de Almacén</h2>

          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Producto</th>
                    <th>Nombre Producto</th>
                    <th>Existencia Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsActuales.map((producto, index) => (
                    <tr key={index}>
                      <td>{producto.CCODIGOPRODUCTO}</td>
                      <td>{producto.CNOMBREPRODUCTO}</td>
                      <td>{producto.EXISTENCIA_TOTAL_PRODUCTO}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.pagination}>
                {renderizarBotonesPaginacion()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventario;
