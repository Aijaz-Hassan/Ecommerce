import { AlertTriangle, Boxes, CircleDollarSign, Package, ShoppingBag, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import AdminWorkspace from "../components/AdminWorkspace";
import { formatCurrency } from "../utils/currency";

const monthLabel = (value) => {
  if (!value) {
    return "Unknown";
  }
  return new Date(value).toLocaleString("en-US", { month: "short" });
};

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    products: 0,
    users: 0,
    orders: 0,
    revenue: 0,
    pendingOrders: 0,
    lowStock: 0
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadOverview() {
      try {
        const [productsResponse, usersResponse, ordersResponse] = await Promise.all([
          api.get("/products"),
          api.get("/auth/users"),
          api.get("/orders/admin-summary")
        ]);

        if (!ignore) {
          const nextProducts = productsResponse.data || [];
          const nextUsers = usersResponse.data || [];
          const nextOrders = ordersResponse.data || [];
          const revenue = nextOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
          const pendingOrders = nextOrders.filter((order) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(String(order.status || "").toUpperCase())).length;
          const lowStock = nextProducts.filter((product) => Number(product.stock || 0) <= 5).length;

          setProducts(nextProducts);
          setUsers(nextUsers);
          setOrders(nextOrders);
          setStats({
            products: nextProducts.length,
            users: nextUsers.length,
            orders: nextOrders.length,
            revenue,
            pendingOrders,
            lowStock
          });
          setError("");
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.response?.data?.message || "Unable to load admin overview.");
        }
      }
    }

    loadOverview();
    return () => {
      ignore = true;
    };
  }, []);

  const analytics = useMemo(() => {
    const monthlyMap = new Map();
    orders.forEach((order) => {
      const label = monthLabel(order.createdAt);
      const current = monthlyMap.get(label) || { label, sales: 0, revenue: 0, orders: 0 };
      order.items?.forEach((item) => {
        current.sales += Number(item.orderedQuantity || 0);
      });
      current.revenue += Number(order.totalAmount || 0);
      current.orders += 1;
      monthlyMap.set(label, current);
    });

    const monthly = Array.from(monthlyMap.values()).slice(-6);
    const topProducts = products
      .map((product) => {
        const sold = orders.reduce(
          (sum, order) =>
            sum + (order.items || []).filter((item) => item.productId === product.id).reduce((itemSum, item) => itemSum + Number(item.orderedQuantity || 0), 0),
          0
        );
        return { ...product, sold };
      })
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    return {
      monthly,
      maxRevenue: Math.max(...monthly.map((entry) => entry.revenue), 1),
      maxOrders: Math.max(...monthly.map((entry) => entry.orders), 1),
      topProducts
    };
  }, [orders, products]);

  const filteredProducts = products.filter((product) => product.name?.toLowerCase().includes(search.toLowerCase())).slice(0, 4);

  return (
    <AdminWorkspace
      title="Dashboard"
      subtitle="Track revenue, products, customers, orders, and stock from one responsive command center."
      search={search}
      onSearchChange={setSearch}
    >
      {error && <p className="error-text">{error}</p>}

      <section className="admin-metric-grid">
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><Package size={20} /></span>
          <p>Total Products</p>
          <strong>{stats.products}</strong>
          <small className="trend-up"><TrendingUp size={14} /> Catalog active</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><ShoppingBag size={20} /></span>
          <p>Total Orders</p>
          <strong>{stats.orders}</strong>
          <small className="trend-up"><TrendingUp size={14} /> Live purchases</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><Users size={20} /></span>
          <p>Total Customers</p>
          <strong>{stats.users}</strong>
          <small className="trend-up"><TrendingUp size={14} /> Registered users</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><CircleDollarSign size={20} /></span>
          <p>Total Revenue</p>
          <strong>{formatCurrency(stats.revenue)}</strong>
          <small className="trend-up"><TrendingUp size={14} /> Gross sales</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><Boxes size={20} /></span>
          <p>Pending Orders</p>
          <strong>{stats.pendingOrders}</strong>
          <small className="trend-down"><TrendingDown size={14} /> Needs attention</small>
        </article>
        <article className="admin-metric-card">
          <span className="admin-metric-icon"><AlertTriangle size={20} /></span>
          <p>Low Stock Alerts</p>
          <strong>{stats.lowStock}</strong>
          <small className="trend-down"><AlertTriangle size={14} /> 5 units or less</small>
        </article>
      </section>

      <section className="admin-analytics-grid">
        <article className="admin-dashboard-panel wide">
          <div className="admin-panel-header">
            <div>
              <h2>Monthly Sales</h2>
              <p>Revenue growth and order trend from purchased orders.</p>
            </div>
          </div>
          <div className="admin-bar-chart">
            {analytics.monthly.length === 0 ? (
              <p className="section-note">Sales data appears after checkout activity.</p>
            ) : (
              analytics.monthly.map((entry) => (
                <div className="admin-bar-column" key={entry.label}>
                  <span style={{ height: `${Math.max(12, (entry.revenue / analytics.maxRevenue) * 100)}%` }} />
                  <strong>{entry.label}</strong>
                  <small>{formatCurrency(entry.revenue)}</small>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <h2>Top Selling Products</h2>
          <div className="admin-mini-list">
            {analytics.topProducts.map((product) => (
              <div key={product.id}>
                <span>{product.name}</span>
                <strong>{product.sold} sold</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <h2>Customer Registrations</h2>
          <div className="admin-donut">
            <strong>{users.length}</strong>
            <span>customers</span>
          </div>
          <p className="section-note">Role-based accounts from the users API.</p>
        </article>
      </section>

      <section className="admin-dashboard-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Inventory Watch</h2>
            <p>Quick view of current stock and low-stock risk.</p>
          </div>
        </div>
        <div className="admin-inventory-grid">
          {(search ? filteredProducts : products.slice(0, 6)).map((product) => (
            <article key={product.id}>
              <img src={product.imageUrl} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <p>{product.category}</p>
              </div>
              <span className={Number(product.stock || 0) <= 5 ? "stock-danger" : "stock-ok"}>{product.stock} left</span>
            </article>
          ))}
        </div>
      </section>
    </AdminWorkspace>
  );
}
