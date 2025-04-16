"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./navbar";
import PedidoNuevo from "./PedidoNuevo";
import styles from "./dashboard.module.css";
import { Bar } from "react-chartjs-2";
import Footer from "./footer";
import "chart.js/auto";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    overdueOrders: 0,
  });

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [topProductsData, setTopProductsData] = useState({ labels: [], datasets: [] });
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem("rol");
    const almacen = localStorage.getItem("almacen");

    setUserRole(role);

    if (!almacen) {
      setError("No se encontró el almacén en el localStorage.");
      setLoading(false);
      return;
    }

    // Cargar métricas de pedidos
    fetch(`/api/metrics?origen=${encodeURIComponent(almacen)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error en la API");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Métricas recibidas:", data);
        setMetrics(data);
        setChartData({
          labels: ["Pendientes", "En Proceso", "Completados", "Atrasados"],
          datasets: [
            {
              label: "Pedidos",
              data: [
                data.pendingOrders,
                data.inProgressOrders,
                data.completedOrders,
                data.overdueOrders,
              ],
              backgroundColor: ["#FF6384", "#36A2EB", "#4BC0C0", "#FF9F40"],
            },
          ],
        });
      })
      .catch((error) => {
        console.error("Error al cargar las métricas:", error);
        setError(error.message);
      });

    // Cargar productos más pedidos
    fetch(`/api/top-products?origen=${encodeURIComponent(almacen)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error al obtener productos más pedidos");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Productos más pedidos recibidos:", data);
        setTopProductsData({
          labels: data.map((item) => item.CCODIGOPRODUCTO),
          datasets: [
            {
              label: "Cantidad Pedida",
              data: data.map((item) => item.totalUnidades),
              backgroundColor: data.map(() => `hsl(${Math.random() * 360}, 70%, 50%)`),
              borderColor: "#ffffff",
              borderWidth: 1,
            },
          ],
        });
      })
      .catch((error) => {
        console.error("Error al cargar productos más pedidos:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleActionRedirect = (route) => {
    router.push(route);
  };

  if (loading) {
    return <p className={styles.loading}>Cargando métricas...</p>;
  }

  if (error) {
    return <p className={styles.error}>Error al cargar datos: {error}</p>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <Navbar />
      <PedidoNuevo />
      <h1 className={styles.title}>Traspasos de Almacén</h1>

      <div className={styles.metricButtons}>
        <button className={styles.metricButton}><h2>Total de Traspasos</h2><p>{metrics.totalOrders}</p></button>
        <button className={styles.metricButton}><h2>Pendientes</h2><p>{metrics.pendingOrders}</p></button>
        <button className={styles.metricButton}><h2>En Proceso</h2><p>{metrics.inProgressOrders}</p></button>
        <button className={styles.metricButton}><h2>Completados</h2><p>{metrics.completedOrders}</p></button>
        <button className={styles.metricButton}><h2>Atrasados</h2><p>{metrics.overdueOrders}</p></button>
      </div>

      <div className={styles.actionButtons}>
        {(userRole === "Admin" || userRole === "Empleado" || userRole === "Supervisor") && (
          <>
            <button onClick={() => handleActionRedirect("/SurtirPedido")} className={styles.actionButton}>Surtir Productos</button>
            <button onClick={() => handleActionRedirect("/RecibirPedido")} className={styles.actionButton}>Recibir Productos</button>
          </>
        )}
        {(userRole === "Admin" || userRole === "Inventarios") && (
          <button onClick={() => handleActionRedirect("/EntregaDomicilio")} className={styles.actionButton}>Inventarios</button>
        )}
      </div>

      <div className={styles.chartBoxes}>
        <div className={styles.box}><h2>Órdenes por Estado</h2><Bar data={chartData} /></div>
        <div className={styles.box}><h2>Productos Más Pedidos</h2><Bar data={topProductsData} /></div>
      </div>

      <Footer />
    </div>
  );
}
