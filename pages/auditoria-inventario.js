import React, { useState, useEffect } from "react";
import styles from "./auditoria-inventario.module.css";
import Navbar from "./navbar";

const AuditoriaInventario = () => {
  const [almacenes, setAlmacenes] = useState([]);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState("");
  const [inventarios, setInventarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [conteos, setConteos] = useState({});
  const [escaneando, setEscaneando] = useState(null);

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
      setConteos(data.reduce((acc, producto) => {
        acc[producto.CCODIGOPRODUCTO] = 0;
        return acc;
      }, {}));
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

  const handleScan = (codigoProducto) => {
    setConteos((prevConteos) => ({
      ...prevConteos,
      [codigoProducto]: prevConteos[codigoProducto] + 1,
    }));
  };

  const finalizarProducto = (codigoProducto) => {
    setEscaneando(null);
  };

  const enviarReporte = async (discrepancias, usuario, contrasena) => {
    try {
      const res = await fetch("/api/enviar-reporte", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discrepancias,
          usuario,
          contrasena,
          almacen: almacenSeleccionado,
          fecha: new Date().toLocaleDateString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Error al enviar el reporte");
      }

      alert("Reporte de discrepancias enviado. La base de datos deberá ser actualizada manualmente.");
    } catch (error) {
      console.error("Error al enviar el reporte:", error);
      alert("Hubo un error al enviar el reporte");
    }
  };

  const actualizarInventario = async (usuario, contrasena) => {
    try {
      const res = await fetch("/api/actualizar-inventario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventarios,
          usuario,
          contrasena,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar el inventario");
      }

      alert("Inventario completado sin discrepancias. Actualizando base de datos...");
    } catch (error) {
      console.error("Error al actualizar el inventario:", error);
      alert("Hubo un error al actualizar el inventario");
    }
  };

  const validarUsuario = async (usuario, contrasena) => {
    try {
      const res = await fetch("/api/validar-usuario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuario, contrasena }),
      });

      if (!res.ok) {
        throw new Error("Error al validar el usuario");
      }

      const data = await res.json();
      console.log('Respuesta de la API de validación:', data);
      return data.rol === "admin" || data.rol === "supervisor";
    } catch (error) {
      console.error("Error al validar el usuario:", error);
      alert("Hubo un error al validar el usuario");
      return false;
    }
  };

  const finalizarInventario = async () => {
    const discrepancias = inventarios.filter(
      (producto) => conteos[producto.CCODIGOPRODUCTO] !== producto.EXISTENCIA_TOTAL_PRODUCTO
    ).map(producto => ({
      ...producto,
      conteoReal: conteos[producto.CCODIGOPRODUCTO]
    }));

    if (discrepancias.length > 0) {
      const opcion = window.confirm("Hay discrepancias en el inventario. ¿Qué deseas hacer?\nAceptar para reportar discrepancias\nCancelar para regresar y escanear");
      if (opcion) {
        // Reportar discrepancias
        const usuario = prompt("Introduce tu usuario:");
        const contrasena = prompt("Introduce tu contraseña:");
        if (usuario && contrasena) {
          const esValido = await validarUsuario(usuario, contrasena);
          if (esValido) {
            enviarReporte(discrepancias, usuario, contrasena);
          } else {
            alert("Usuario no autorizado. Solo los administradores o supervisores pueden realizar esta acción.");
          }
        }
      } else {
        // Regresar y escanear
        setInventarios(discrepancias);
      }
    } else {
      const usuario = prompt("Introduce tu usuario:");
      const contrasena = prompt("Introduce tu contraseña:");
      if (usuario && contrasena) {
        const esValido = await validarUsuario(usuario, contrasena);
        if (esValido) {
          actualizarInventario(usuario, contrasena);
        } else {
          alert("Usuario no autorizado. Solo los administradores o supervisores pueden realizar esta acción.");
        }
      }
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Auditoría de Inventario</h1>

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
        </div>

        {/* Inventario por Almacén */}
        <div className={styles.panelContainer}>
          <h2>Inventario de Almacén</h2>

          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Producto</th>
                  <th>Nombre Producto</th>
                  <th>Existencia Total</th>
                  <th>Auditoría</th>
                </tr>
              </thead>
              <tbody>
                {inventarios.map((producto, index) => (
                  <tr key={index}>
                    <td>{producto.CCODIGOPRODUCTO}</td>
                    <td>{producto.CNOMBREPRODUCTO}</td>
                    <td>{producto.EXISTENCIA_TOTAL_PRODUCTO}</td>
                    <td>
                      {escaneando === producto.CCODIGOPRODUCTO ? (
                        <>
                          <input
                            type="number"
                            className={styles.input}
                            value={conteos[producto.CCODIGOPRODUCTO]}
                            readOnly
                          />
                          <button
                            onClick={() => finalizarProducto(producto.CCODIGOPRODUCTO)}
                            className={styles.button}
                          >
                            Terminar de contar producto
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEscaneando(producto.CCODIGOPRODUCTO)}
                          className={styles.button}
                        >
                          Escanear producto
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.panelContainer}>
          <button onClick={finalizarInventario} className={styles.button}>
            Finalizar Inventario
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaInventario;