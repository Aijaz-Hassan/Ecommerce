import { CreditCard, PackageCheck, RotateCcw, Search, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import AdminWorkspace from "../components/AdminWorkspace";
import { formatCurrency } from "../utils/currency";

const orderStatuses = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState(null);
  const [actionForm, setActionForm] = useState({ status: "PROCESSING", reason: "" });
  const [savingAction, setSavingAction] = useState(false);

  const loadData = async () => {
    try {
      const [ordersResponse, productsResponse] = await Promise.all([
        api.get("/orders/admin-summary"),
        api.get("/products")
      ]);
      setOrders(ordersResponse.data || []);
      setProducts(productsResponse.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load customer orders.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUnitsLeft = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    [products]
  );
  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [order.orderNumber, order.customerName, order.customerEmail, order.status].some((value) => String(value || "").toLowerCase().includes(query)) ||
        (order.items || []).some((item) => item.productName?.toLowerCase().includes(query));
      const matchesStatus = status === "all" || String(order.status || "").toLowerCase() === status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);
  const statuses = useMemo(() => ["all", ...new Set(orders.map((order) => String(order.status || "").toLowerCase()).filter(Boolean))], [orders]);
  const paidOrders = orders.filter((order) => !["cancelled", "refunded"].includes(String(order.status || "").toLowerCase())).length;
  const lowStockProducts = products.filter((product) => Number(product.stock || 0) <= 5);

  const openAction = (type, order) => {
    setAction({ type, order });
    setActionForm({
      status: order.status || "PROCESSING",
      reason: ""
    });
    setError("");
    setMessage("");
  };

  const closeAction = () => {
    setAction(null);
    setActionForm({ status: "PROCESSING", reason: "" });
    setSavingAction(false);
  };

  const replaceOrder = (updatedOrder) => {
    setOrders((current) => current.map((order) => (order.orderId === updatedOrder.orderId ? updatedOrder : order)));
  };

  const handleAdminOrderAction = async (event) => {
    event.preventDefault();
    if (!action?.order) {
      return;
    }

    setSavingAction(true);
    setError("");
    setMessage("");
    try {
      const orderId = action.order.orderId;
      let response;
      if (action.type === "status") {
        response = await api.put(`/orders/admin/${orderId}/status`, {
          status: actionForm.status,
          cancellationReason: actionForm.reason
        });
        setMessage("Order status updated successfully.");
      }
      if (action.type === "cancel") {
        response = await api.put(`/orders/admin/${orderId}/cancel`, {
          reason: actionForm.reason
        });
        setMessage("Order cancelled and stock restored.");
      }
      if (action.type === "refund") {
        response = await api.put(`/orders/admin/${orderId}/refund`, {
          reason: actionForm.reason
        });
        setMessage("Refund recorded, order cancelled, and stock restored.");
      }
      if (response?.data) {
        replaceOrder(response.data);
      }
      await loadData();
      closeAction();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update order.");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <AdminWorkspace
      title="Orders & Inventory"
      subtitle="See purchased orders, payment state, delivery progress, refunds, and real-time product stock."
      search={search}
      onSearchChange={setSearch}
      actions={
        <button className="ghost-button" type="button" onClick={loadData}>
          <RotateCcw size={16} />
          Refresh
        </button>
      }
    >
      <section className="admin-metric-grid compact">
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><PackageCheck size={20} /></span>
          <p>Total customer orders</p>
          <strong>{orders.length}</strong>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><CreditCard size={20} /></span>
          <p>Payment status</p>
          <strong>{paidOrders}</strong>
          <small>Paid/active orders</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><Truck size={20} /></span>
          <p>Delivery queue</p>
          <strong>{filteredOrders.length}</strong>
          <small>Filtered orders</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><PackageCheck size={20} /></span>
          <p>Products in catalog</p>
          <strong>{products.length}</strong>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><PackageCheck size={20} /></span>
          <p>Total units left</p>
          <strong>{totalUnitsLeft}</strong>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><PackageCheck size={20} /></span>
          <p>Low stock warnings</p>
          <strong>{lowStockProducts.length}</strong>
        </article>
      </section>

      <section className="admin-panel">
        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}
        <div className="admin-panel-header">
          <div>
            <h2>Purchased orders</h2>
            <p>{filteredOrders.length} matching orders</p>
          </div>
          <div className="admin-row-actions">
            <label className="compact-admin-filter">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" />
            </label>
            <select className="admin-select-control" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((entry) => (
                <option key={entry} value={entry}>{entry === "all" ? "All statuses" : entry}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-table">
          {filteredOrders.length === 0 ? (
            <article className="admin-row">
              <div>
                <strong>No purchases yet</strong>
                <p>Customer purchases will appear here once checkout happens.</p>
              </div>
            </article>
          ) : (
            filteredOrders.map((order) => (
              <article className="admin-row admin-order-row" key={order.orderId}>
                <div className="admin-order-block">
                  <strong>{order.customerName}</strong>
                  <p>{order.customerEmail}</p>
                  <p>Order {order.orderNumber}</p>
                  <p>Status: {order.status}</p>
                </div>
                <div className="admin-order-block">
                  <strong>Purchased items</strong>
                  {order.items.map((item) => (
                    <p key={`${order.orderId}-${item.productId}`}>
                      {item.productName} x{item.orderedQuantity} | Stock left: {item.remainingStock}
                    </p>
                  ))}
                </div>
                <div className="admin-order-block">
                  <strong>Total</strong>
                  <p>{formatCurrency(order.totalAmount)}</p>
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                  <div className="admin-row-actions">
                    <button className="ghost-button" type="button" onClick={() => openAction("status", order)}>
                      Update status
                    </button>
                    <button className="ghost-button" type="button" onClick={() => openAction("cancel", order)} disabled={["CANCELLED", "DELIVERED"].includes(order.status)}>
                      Cancel
                    </button>
                    <button className="ghost-button" type="button" onClick={() => openAction("refund", order)} disabled={order.status === "CANCELLED"}>
                      Refund
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Current stock by product</h2>
            <p>Low stock items are highlighted for restock planning.</p>
          </div>
        </div>
        <div className="admin-table">
          {products.map((product) => (
            <article className="admin-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p>{product.category}</p>
              </div>
              <div className={`stock-pill ${Number(product.stock || 0) <= 5 ? "low" : ""}`}>
                <strong>{product.stock}</strong>
                <span>Units left</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {action && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeAction}>
          <form className="confirmation-modal admin-order-action-modal" onSubmit={handleAdminOrderAction} onMouseDown={(event) => event.stopPropagation()}>
            <h2>
              {action.type === "status" && "Update order status"}
              {action.type === "cancel" && "Cancel order"}
              {action.type === "refund" && "Refund order"}
            </h2>
            <p>
              Order {action.order.orderNumber} for {action.order.customerName}
            </p>

            {action.type === "status" && (
              <label className="filter-field">
                <span>Status</span>
                <select value={actionForm.status} onChange={(event) => setActionForm((current) => ({ ...current, status: event.target.value }))}>
                  {orderStatuses.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>
            )}

            {(action.type !== "status" || actionForm.status === "CANCELLED") && (
              <label className="filter-field">
                <span>{action.type === "refund" ? "Refund reason" : "Cancellation reason"}</span>
                <textarea
                  rows="4"
                  value={actionForm.reason}
                  onChange={(event) => setActionForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Write a short reason for the admin record"
                  required
                />
              </label>
            )}

            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={closeAction}>
                Close
              </button>
              <button className={action.type === "status" ? "solid-button" : "danger-button"} type="submit" disabled={savingAction}>
                {savingAction ? "Saving..." : action.type === "status" ? "Update status" : action.type === "cancel" ? "Cancel order" : "Record refund"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminWorkspace>
  );
}
