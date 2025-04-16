import React, { useState, useEffect } from "react";
import Navbar from "./navbar";
import styles from "./PedidoNuevo.module.css";

const PedidoNuevo = () => {
  const [step, setStep] = useState(1);
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [formData, setFormData] = useState({
    TipoMovimiento: "",
    Origen: "",
    Destino: "",
    Producto: [],
    Usuario: "",
    Contraseña: "",
    NumeroPedido: "",
    Fecha_Creacion: new Date().toISOString().split("T")[0],
    Fecha_Compromiso: new Date(new Date().setDate(new Date().getDate() + 15))
      .toISOString()
      .split("T")[0],
  });
  const [newProducto, setNewProducto] = useState({
    ProductoID: "",
    Unidades: "",
  });

  // Cargar datos iniciales desde la API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movRes, almRes, prodRes] = await Promise.all([
          fetch("/api/documentos-modelo"),
          fetch("/api/almacenes"),
          fetch("/api/Productos"),
        ]);

        if (!movRes.ok || !almRes.ok || !prodRes.ok)
          throw new Error("Error al cargar datos iniciales");

        const [movData, almData, prodData] = await Promise.all([
          movRes.json(),
          almRes.json(),
          prodRes.json(),
        ]);

        setMovimientos(movData);
        setAlmacenes(almData);
        setProductos(prodData);
      } catch (error) {
        console.error(error);
        alert("Error al cargar los datos iniciales.");
      }
    };

    fetchData();
  }, []);

  // Manejo de cambios en los formularios
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleProductoChange = (e) => {
    const { name, value } = e.target;
    setNewProducto({ ...newProducto, [name]: value });
  };

  const agregarProducto = () => {
    if (!newProducto.ProductoID || !newProducto.Unidades) {
      alert("Selecciona un producto y especifica las unidades.");
      return;
    }
  
    const productoSeleccionado = productos.find(
      (prod) => prod.CIDPRODUCTO === parseInt(newProducto.ProductoID)
    );
  
    if (!productoSeleccionado) {
      alert("Producto no encontrado.");
      return;
    }
  
    setFormData((prevState) => ({
      ...prevState,
      Producto: [
        ...prevState.Producto,
        { 
          ...newProducto, 
          NombreProducto: productoSeleccionado.CNOMBREPRODUCTO,
          CodigoProducto: productoSeleccionado.CCODIGOPRODUCTO // Añadir el código del producto
        },
      ],
    }));
    setNewProducto({ ProductoID: "", Unidades: "" });
  };

  
  const validarYRegistrarPedido = async () => {
    if (!formData.Usuario || !formData.Contraseña) {
      alert("Debe ingresar un usuario y una contraseña.");
      return;
    }
  
    try {
      const res = await fetch(
        `/api/data?type=validarUsuario&usuario=${formData.Usuario}&contrasena=${formData.Contraseña}`,
        { method: "GET" }
      );
  
      if (!res.ok) {
        alert("Error al validar credenciales.");
        return;
      }
  
      const data = await res.json();
  
      if (!data.valid) {
        alert("Usuario o contraseña incorrectos.");
        return;
      }
  
      await registrarPedido();
    } catch (error) {
      console.error("Error durante la validación:", error);
      alert("Hubo un error al validar las credenciales.");
    }
  };

  // Registrar pedido
  const registrarPedido = async () => {
    try {
      const res = await fetch("/api/insertar-movimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData), // Enviar todos los datos, incluidos los productos
      });
  
      if (!res.ok) {
        alert("Error al registrar el pedido.");
        return;
      }
  
      const data = await res.json();
  
      // Enviar correo tras registrar
      await enviarCorreo(data.NumeroPedido, formData);
      alert(`Pedido registrado con éxito. Número de Pedido: ${data.NumeroPedido}`);
  
      // Reiniciar el formulario y volver al paso 1
      setFormData({
        TipoMovimiento: "",
        Origen: "",
        Destino: "",
        Producto: [],
        Usuario: "",
        Contraseña: "",
        NumeroPedido: "",
        Fecha_Creacion: new Date().toISOString().split("T")[0],
        Fecha_Compromiso: new Date(new Date().setDate(new Date().getDate() + 15))
          .toISOString()
          .split("T")[0],
      });
  
      setStep(1);
    } catch (error) {
      console.error("Error al registrar el pedido:", error);
      alert("Hubo un error al registrar el pedido.");
    }
  };

  // Enviar correo
  const enviarCorreo = async (numeroPedido, formData) => {
    try {
      const response = await fetch("/api/enviar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numeroPedido, formData }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar el correo");
      }

      alert("Correo enviado con éxito.");
    } catch (error) {
      console.error("Error al enviar el correo:", error);
      alert("Hubo un error al enviar el correo.");
    }
  };

  const avanzarPaso = () => setStep((prev) => prev + 1);
  const retrocederPaso = () => setStep((prev) => prev - 1);

  return (
    <div>
      <Navbar />
      <div className={styles.formContainer}>
        <h3>Registrar Nuevo Pedido</h3>
        {/* Renders por pasos*/}
        {step === 1 && (
          <div>
            <h4>Paso 1: Seleccionar Tipo de Movimiento</h4>
            <select name="TipoMovimiento" value={formData.TipoMovimiento} onChange={handleChange}>
              <option value="">Seleccione un movimiento</option>
              {movimientos.map((mov) => (
                <option key={mov.CIDDOCUMENTODE} value={mov.CIDDOCUMENTODE}>
                  {mov.CDESCRIPCION}
                </option>
              ))}
            </select>
            <button onClick={avanzarPaso}>Siguiente</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h4>Paso 2: Seleccionar Almacén de Origen y Destino</h4>
            <select name="Origen" value={formData.Origen} onChange={handleChange}>
              <option value="">Seleccione un almacén</option>
              {almacenes.map((almacen) => (
                <option key={almacen.CIDALMACEN} value={almacen.CIDALMACEN}>
                  {almacen.CNOMBREALMACEN}
                </option>
              ))}
            </select>

            <select name="Destino" value={formData.Destino} onChange={handleChange}>
              <option value="">Seleccione un almacén</option>
              {almacenes.map((almacen) => (
                <option key={almacen.CIDALMACEN} value={almacen.CIDALMACEN}>
                  {almacen.CNOMBREALMACEN}
                </option>
              ))}
            </select>

            <button onClick={retrocederPaso}>Retroceder</button>
            <button onClick={avanzarPaso}>Siguiente</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h4>Paso 3: Seleccionar Productos</h4>
            <select name="ProductoID" value={newProducto.ProductoID} onChange={handleProductoChange}>
              <option value="">Seleccione un producto</option>
              {productos.map((producto) => (
                <option key={producto.CIDPRODUCTO} value={producto.CIDPRODUCTO}>
                  {producto.CNOMBREPRODUCTO}
                </option>
              ))}
            </select>
            <input
              type="number"
              name="Unidades"
              value={newProducto.Unidades}
              onChange={handleProductoChange}
              placeholder="Unidades"
            />
            <button onClick={agregarProducto}>Agregar Producto</button>

            <h5>Productos seleccionados:</h5>
            <ul>
              {formData.Producto.map((prod, index) => (
                <li key={index}>
                  {prod.NombreProducto} - {prod.Unidades} unidades
                </li>
              ))}
            </ul>

            <button onClick={retrocederPaso}>Retroceder</button>
            <button onClick={avanzarPaso}>Siguiente</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h4>Resumen del Pedido</h4>
            <p>Tipo de Movimiento: {formData.TipoMovimiento}</p>
            <p>Origen: {formData.Origen}</p>
            <p>Destino: {formData.Destino}</p>
            <h5>Productos:</h5>
            <ul>
              {formData.Producto.map((prod, index) => (
                <li key={index}>
                  {prod.NombreProducto} - {prod.Unidades} unidades
                </li>
              ))}
            </ul>

            <h5>Ingrese sus credenciales para confirmar:</h5>
            <input
              type="text"
              name="Usuario"
              value={formData.Usuario}
              onChange={handleChange}
              placeholder="Usuario"
            />
            <input
              type="password"
              name="Contraseña"
              value={formData.Contraseña}
              onChange={handleChange}
              placeholder="Contraseña"
            />
            <button onClick={retrocederPaso}>Retroceder</button>
            <button onClick={validarYRegistrarPedido}>Finalizar Pedido</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PedidoNuevo;
