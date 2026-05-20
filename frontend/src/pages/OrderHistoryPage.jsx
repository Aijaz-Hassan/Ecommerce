import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import { formatCurrency } from "../utils/currency";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      try {
        const response = await api.get("/orders/history");
        if (!ignore) {
          setOrders(response.data || []);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.message || "Unable to load order history.");
          setStatus("ready");
        }
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="page">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Order history</p>
          <h1>Look back at the previous orders you have already purchased.</h1>
        </div>
        <Link className="ghost-link" to="/orders">
          Back to my orders
        </Link>
      </section>

      {status === "loading" ? (
        <div className="loading-panel">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="loading-panel">
          {message || "No previous orders yet. Your earlier purchases will appear here once you place more than one order."}
        </div>
      ) : (
        <section className="orders-grid">
          {orders.map((order) => (
            <article className="admin-panel order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <p className="eyebrow">Order {order.orderNumber}</p>
                  <h2>{new Date(order.createdAt).toLocaleString()}</h2>
                </div>
                <span className="status-badge">{order.status}</span>
              </div>

              <div className="order-card-meta">
                <div>
                  <strong>{order.items.length}</strong>
                  <span>Items</span>
                </div>
                <div>
                  <strong>{formatCurrency(order.totalAmount)}</strong>
                  <span>Total</span>
                </div>
                <div>
                  <strong>{order.paymentProvider}</strong>
                  <span>Payment</span>
                </div>
              </div>

              <p className="section-note">
                {order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}
              </p>

              <div className="tracking-summary-box">
                <strong>{order.trackingLocation}</strong>
                <p>{order.trackingNote}</p>
              </div>

              <div className="admin-row-actions">
                <Link className="solid-link" to={`/orders/${order.id}`}>
                  View details
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
