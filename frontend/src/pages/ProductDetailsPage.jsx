import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { fallbackProducts } from "../data/fallbackProducts";
import { formatCurrency } from "../utils/currency";
import { isAdminRole } from "../utils/roles";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const isAdmin = isAdminRole(user?.role);
  const isPreviewProduct = product ? !Number.isFinite(Number(product.id)) : false;

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      setStatus("loading");
      try {
        const response = await api.get(`/products/${id}`);
        if (!ignore) {
          setProduct(response.data);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          const localProduct = fallbackProducts.find((item) => String(item.id) === String(id));
          setProduct(localProduct || null);
          setStatus("ready");
        }
      }
    }

    loadProduct();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (status === "loading") {
    return <main className="page"><div className="loading-panel">Loading product details...</div></main>;
  }

  if (!product) {
    return (
      <main className="page">
        <div className="loading-panel">Product not found.</div>
      </main>
    );
  }

  const handleAddToCart = async () => {
    if (isPreviewProduct) {
      window.alert("Preview products cannot be added to cart until the backend product list is available.");
      return;
    }

    if (!isAuthenticated) {
      window.alert("Please login as a customer to use the cart.");
      navigate("/login");
      return;
    }

    if (isAdmin) {
      window.alert("Admin accounts cannot add items to the cart.");
      return;
    }

    try {
      await addToCart(product);
      window.alert(`${product.name} added to cart.`);
    } catch (error) {
      window.alert(error.response?.data?.message || error.message || "Unable to add product to cart.");
    }
  };

  return (
    <main className="page">
      <section className="product-page-layout amazon-style-layout">
        <div className="product-page-image-wrap product-gallery-panel">
          <img className="product-page-image" src={product.imageUrl} alt={product.name} />
        </div>

        <div className="product-page-copy product-info-panel">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <div className="product-rating-line">
            <strong>4.4</strong>
            <span>Trusted by frequent shoppers for everyday use and quality finish.</span>
          </div>
          <strong className="product-page-price">{formatCurrency(product.price)}</strong>
          <p className="section-note">
            Inclusive of premium finish, careful packaging, and responsive customer support.
          </p>

          <div className="product-description-box">
            <strong>About this item</strong>
            <ul className="details-list">
              <li>{product.description}</li>
              <li>Category: {product.category}</li>
              <li>Current stock: {product.stock} item(s)</li>
              <li>Designed for practical daily use with a polished storefront presentation.</li>
            </ul>
          </div>
        </div>

        <aside className="buy-box-panel">
          <strong className="buy-box-price">{formatCurrency(product.price)}</strong>
          <p className="buy-box-note">Fast local dispatch. Secure packaging. Smooth returns support.</p>
          <div className="buy-box-stock">
            <span>{product.stock > 0 ? "In Stock" : "Out of Stock"}</span>
            <small>{product.stock} available right now</small>
          </div>
          {!isAdmin && (
            <div className="buy-box-actions">
              <button className="solid-button" type="button" onClick={handleAddToCart} disabled={product.stock <= 0}>
                Add to cart
              </button>
              <Link className="ghost-link" to={isAuthenticated ? "/cart" : "/login"}>
                View cart
              </Link>
            </div>
          )}
          <div className="product-description-box compact-box">
            <strong>Delivery</strong>
            <p>Estimated quick delivery with careful packaging and live stock visibility.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
