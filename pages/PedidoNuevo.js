import React, { useState, useEffect, useRef } from "react";

const PedidoNuevo = () => {
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const ultimoPedidoID = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [almRes, prodRes] = await Promise.all([
          fetch("/api/almacenes"),
          fetch("/api/Productos"),
        ]);

        if (!almRes.ok || !prodRes.ok) throw new Error("Error al cargar datos iniciales");

        setAlmacenes(await almRes.json());
        setProductos(await prodRes.json());
      } catch (error) {
        console.error("❌ Error al cargar los datos iniciales:", error);
      }
    };

    fetchData();
    const intervalId = setInterval(() => obtenerPedidos(), 2000); 

    return () => clearInterval(intervalId);
  }, []);

  const obtenerPedidos = async () => {
    try {
      const res = await fetch("/api/obtener-pedidos");
      if (!res.ok) throw new Error("Error al obtener los pedidos");

      const pedidos = await res.json();
      console.log("📦 Pedidos obtenidos:", pedidos); 

      if (!Array.isArray(pedidos) || pedidos.length === 0) {
        console.log("🚫 No hay nuevos pedidos.");
        return;
      }

      // Filtrar pedidos con DestinoID !== 99
      const pedidosValidos = pedidos.filter((pedido) => pedido.Destino !== 99);

      for (const pedido of pedidosValidos) {
        if (ultimoPedidoID.current && pedido.NumeroPedido <= ultimoPedidoID.current) {
          continue;
        }

        if (!pedido.Producto || !Array.isArray(pedido.Producto) || pedido.Producto.length === 0) {
          console.warn(`⚠️ Pedido ${pedido.NumeroPedido} no tiene productos válidos.`);
          continue;
        }

        const nuevoPedido = {
          NumeroPedido: pedido.NumeroPedido || "00000",
          Producto: pedido.Producto.map(({ ProductoID, Unidades }) => ({
            ProductoID,
            Unidades,
          })),
          Origen: pedido.Origen || "Almacén Desconocido",
          Destino: pedido.Destino || "Destino Desconocido",
          TipoMovimiento: pedido.TipoMovimiento || "Desconocido",
          Fecha_Creacion: new Date().toISOString().split("T")[0],
        };

        await registrarPedido(nuevoPedido);
        ultimoPedidoID.current = pedido.NumeroPedido;
      }
    } catch (error) {
      console.error("❌ Error al obtener los pedidos:", error);
    }
  };

  const registrarPedido = async (pedido) => {
    console.log("📦 Registrando pedido:", JSON.stringify(pedido, null, 2));
    try {
      const resInsert = await fetch("/api/insertar-movimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      if (!resInsert.ok) {
        throw new Error(`Error en insertar-movimiento: ${await resInsert.text()}`);
      }

      console.log(`✅ Pedido registrado: ${pedido.NumeroPedido}`);
    } catch (error) {
      console.error("❌ Error en el registro de pedido:", error);
    }
  };

  return null;
};

export default PedidoNuevo;
