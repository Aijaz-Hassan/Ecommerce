import { ImagePlus, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import AdminWorkspace from "../components/AdminWorkspace";
import { formatCurrency } from "../utils/currency";

const initialForm = {
  id: null,
  name: "",
  description: "",
  category: "",
  imageUrl: "",
  price: "",
  stock: ""
};

export default function AdminProductsPage() {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [previewImage, setPreviewImage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const pageSize = 6;

  const loadProducts = async () => {
    setRefreshing(true);
    try {
      const response = await api.get("/products");
      setProducts(response.data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load products.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock)
      };
      delete payload.id;

      if (form.id) {
        await api.put(`/products/${form.id}`, payload);
        setMessage("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        setMessage("Product created successfully.");
      }

      setForm(initialForm);
      setPreviewImage("");
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save product.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      price: product.price,
      stock: product.stock
    });
    setPreviewImage(product.imageUrl);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    }
  };

  const handleImagePreview = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPreviewImage(URL.createObjectURL(file));
    setMessage("Image preview selected. Add a hosted Image URL before saving so the backend can store it.");
  };

  const categories = useMemo(() => ["all", ...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || [product.name, product.description, product.category].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesCategory = category === "all" || product.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, products, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminWorkspace
      title="Products Management"
      subtitle="Add products, edit pricing, update stock, filter catalog records, and remove discontinued items."
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      actions={
        <button className="solid-button" type="button" onClick={() => document.getElementById("admin-product-name")?.focus()}>
          <Plus size={17} />
          Add product
        </button>
      }
    >
      <section className="admin-console">
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{form.id ? "Update Product" : "Add Product"}</h2>
          <label>
            Product name
            <input id="admin-product-name" name="name" value={form.name} onChange={handleChange} placeholder="Aurora Noise-Cancel Headset" required />
          </label>
          <label>
            Category
            <input name="category" value={form.category} onChange={handleChange} placeholder="Audio" required />
          </label>
          <label className="full-span">
            Description
            <textarea
              name="description"
              rows="4"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the product story, build quality, and standout features"
              required
            />
          </label>
          <label>
            Image URL
            <input name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://example.com/image.jpg" required />
          </label>
          <label>
            Product image upload
            <span className="file-input-shell">
              <ImagePlus size={17} />
              <input type="file" accept="image/*" onChange={handleImagePreview} />
            </span>
          </label>
          <label>
            Price
            <input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} placeholder="199.99" required />
          </label>
          <label>
            Stock
            <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="25" required />
          </label>
          <label>
            SKU
            <input value={form.id ? `LL-${form.id}` : "Generated after save"} disabled />
          </label>
          <label>
            Discount
            <input value="Configure with coupons module" disabled />
          </label>
          {(previewImage || form.imageUrl) && <img className="admin-product-preview full-span" src={previewImage || form.imageUrl} alt="Product preview" />}
          {message && <p className="success-text full-span">{message}</p>}
          {error && <p className="error-text full-span">{error}</p>}
          <div className="admin-form-actions full-span">
            <button className="solid-button" type="submit" disabled={loading}>
              {loading ? "Saving..." : form.id ? "Update Product" : "Add Product"}
            </button>
            {form.id && (
              <button className="ghost-button" type="button" onClick={() => { setForm(initialForm); setPreviewImage(""); }}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <section className="admin-lists">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Products</h2>
                <p>{filteredProducts.length} matching items</p>
              </div>
              <div className="admin-row-actions">
                <label className="compact-admin-filter">
                  <Search size={16} />
                  <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products" />
                </label>
                <select className="admin-select-control" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>{entry === "all" ? "All categories" : entry}</option>
                  ))}
                </select>
                <button className="ghost-button" type="button" onClick={loadProducts}>
                  <RotateCcw size={16} />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            <div className="admin-table">
              {pagedProducts.map((product) => (
                <article className="admin-row admin-product-row" key={product.id}>
                  <img src={product.imageUrl} alt={product.name} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.category}</p>
                    <p>SKU: LL-{product.id} | Price: {formatCurrency(product.price)}</p>
                  </div>
                  <span className={Number(product.stock || 0) <= 5 ? "stock-danger" : "stock-ok"}>{product.stock} in stock</span>
                  <div className="admin-row-actions">
                    <button className="ghost-button" type="button" onClick={() => handleEditProduct(product)}>
                      Update
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDeleteProduct(product.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="admin-pagination">
              <button className="ghost-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button className="ghost-button" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </button>
            </div>
          </div>
        </section>
      </section>
    </AdminWorkspace>
  );
}
