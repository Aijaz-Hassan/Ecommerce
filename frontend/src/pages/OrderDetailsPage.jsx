import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { formatCurrency } from "../utils/currency";

const trackingSteps = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadOrder() {
      try {
        const response = await api.get(`/orders/my/${id}`);
        if (!ignore) {
          setOrder(response.data);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.message || "Unable to load this order.");
          setStatus("ready");
        }
      }
    }

    loadOrder();
    return () => {
      ignore = true;
    };
  }, [id]);

  const activeStepIndex = useMemo(() => {
    if (!order) {
      return 0;
    }
    const index = trackingSteps.indexOf(order.status);
    return index >= 0 ? index : 0;
  }, [order]);

  const mapQuery = useMemo(() => {
    if (!order) {
      return "";
    }

    return encodeURIComponent(
      [order.addressLine1, order.addressLine2, order.city, order.state, order.postalCode, order.country]
        .filter(Boolean)
        .join(", ")
    );
  }, [order]);

  if (status === "loading") {
    return <main className="page"><div className="loading-panel">Loading order details...</div></main>;
  }

  if (!order) {
    return <main className="page"><div className="loading-panel">{message || "Order not found."}</div></main>;
  }

  return (
    <main className="page">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Track order</p>
          <h1>{order.orderNumber}</h1>
          <p className="section-note">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Link className="ghost-link" to="/orders">
          Back to orders
        </Link>
      </section>

      <section className="order-tracker">
        {trackingSteps.map((step, index) => (
          <div className={`tracker-step${index <= activeStepIndex ? " active" : ""}`} key={step}>
            <span className="tracker-dot" />
            <strong>{step.replace("_", " ")}</strong>
          </div>
        ))}
      </section>

      <section className="tracking-location-layout">
        <div className="admin-panel tracking-panel">
          <h2>Live tracking</h2>
          <div className="tracking-summary-box">
            <strong>{order.trackingLocation}</strong>
            <p>{order.trackingNote}</p>
          </div>

          <div className="order-address-block">
            <strong>Delivering to</strong>
            <p>{order.recipientName}</p>
            <p>{order.phoneNumber}</p>
            <p>{order.addressLine1}</p>
            {order.addressLine2 && <p>{order.addressLine2}</p>}
            <p>
              {order.city}, {order.state} {order.postalCode}
            </p>
            <p>{order.country}</p>
          </div>
        </div>

        <div className="admin-panel map-panel">
          <h2>Delivery map</h2>
          <div className="map-frame-wrap">
            <iframe
              title="Delivery address map"
              src={`https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section className="order-details-layout">
        <div className="admin-panel">
          <h2>Purchased items</h2>
          <div className="admin-table">
            {order.items.map((item) => (
              <article className="cart-item-row order-item-row" key={item.id}>
                <img className="cart-item-image" src={item.imageUrl} alt={item.productName} />
                <div className="cart-item-info">
                  <strong>{item.productName}</strong>
                  <p>{item.category}</p>
                </div>
                <div className="order-item-meta">
                  <strong>Qty {item.quantity}</strong>
                  <span>{formatCurrency(item.lineTotal)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="cart-aside">
          <div className="admin-panel">
            <h2>Bill details</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{formatCurrency(order.subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Tax</span>
              <strong>{formatCurrency(order.taxAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Shipping</span>
              <strong>{formatCurrency(order.shippingAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Total</span>
              <strong>{formatCurrency(order.totalAmount)}</strong>
            </div>
            <div className="summary-line">
              <span>Payment</span>
              <strong>{order.paymentProvider}</strong>
            </div>
            <div className="summary-line">
              <span>Status</span>
              <strong>{order.status}</strong>
            </div>
            <div className="summary-line">
              <span>Destination</span>
              <strong>{order.city}</strong>
            </div>
            {order.cancellationReason && (
              <div className="order-cancel-box details-cancel-box">
                <strong>Cancellation reason</strong>
                <p>{order.cancellationReason}</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
