import { useMemo, useState } from "react";
import { ArrowRight, Heart, Mail, ShoppingBag, Star, Truck, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ProductQuickViewModal from "../components/ProductQuickViewModal";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../hooks/useProducts";
import { formatCurrency } from "../utils/currency";
import { isAdminRole } from "../utils/roles";

const categoryCards = [
  {
    name: "Fashion",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Watches",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Accessories",
    image: "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Beauty",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80"
  }
];

const testimonials = [
  {
    name: "Maya Kapoor",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    text: "The store feels polished, fast, and trustworthy. Product discovery is exactly what a premium shop should feel like."
  },
  {
    name: "Arjun Mehta",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    text: "Clean checkout, beautiful cards, and the product quick view makes browsing feel effortless."
  },
  {
    name: "Sara Williams",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    text: "I love the responsive design. It looks like a real ecommerce brand on desktop and mobile."
  }
];

function ProductSkeletonGrid() {
  return (
    <section className="home-products-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <article className="home-product-card skeleton-card" key={index}>
          <div />
          <span />
          <strong />
          <p />
        </article>
      ))}
    </section>
  );
}

export default function HomePage() {
  const { products, source, status } = useProducts();
  const { addToCart, cartItems, cartTotal } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const isAdmin = isAdminRole(user?.role);

  const featuredProducts = useMemo(() => products.slice(0, 8), [products]);
  const bestSellingProducts = useMemo(() => products.slice(4, 10).concat(products.slice(0, 2)).slice(0, 8), [products]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleWishlist = (id) => {
    setWishlist((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
    showToast("Wishlist updated.");
  };

  const handleAddToCart = async (product) => {
    if (!Number.isFinite(Number(product.id))) {
      showToast("Preview products need the backend product list before cart actions.", "error");
      return;
    }
    if (!isAuthenticated) {
      showToast("Please login as a customer to use the cart.", "error");
      navigate("/login");
      return;
    }
    if (isAdmin) {
      showToast("Admin accounts cannot add items to cart.", "error");
      return;
    }

    try {
      await addToCart(product);
      showToast(`${product.name} added to cart.`);
    } catch (error) {
      showToast(error.response?.data?.message || error.message || "Unable to add product to cart.", "error");
    }
  };

  const handleNewsletter = (event) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) {
      showToast("Enter an email address to subscribe.", "error");
      return;
    }
    setNewsletterEmail("");
    showToast("You are subscribed to new drops and offers.");
  };

  const renderProductCard = (product, compact = false) => {
    const wished = wishlist.includes(product.id);

    return (
      <article className={`home-product-card${compact ? " compact" : ""}`} key={product.id}>
        <button className={`product-wishlist-button${wished ? " active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label="Add to wishlist">
          <Heart size={18} fill={wished ? "currentColor" : "none"} />
        </button>
        <button className="product-image-button" type="button" onClick={() => setQuickViewProduct(product)}>
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
          <span>Quick View</span>
        </button>
        <div className="home-product-body">
          <div className="product-card-topline">
            <span>{product.category}</span>
            <em>{compact ? "Hot" : "Save 20%"}</em>
          </div>
          <h3>{product.name}</h3>
          <div className="home-rating">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={14} fill="currentColor" />
            ))}
            <span>4.8</span>
          </div>
          <div className="home-product-footer">
            <strong>{formatCurrency(product.price)}</strong>
            {!isAdmin && (
              <button className="icon-button" type="button" onClick={() => handleAddToCart(product)} aria-label="Add to cart">
                <ShoppingBag size={18} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="home-page">
      {toast && <div className={`floating-toast ${toast.type}`}>{toast.message}</div>}

      <section className="commerce-hero" id="about">
        <div className="hero-media" />
        <div className="hero-overlay" />
        <div className="commerce-hero-content">
          <p className="eyebrow">Spring luxury sale</p>
          <h1>Premium essentials for every modern lifestyle.</h1>
          <p>
            Discover curated fashion, electronics, watches, accessories, and beauty picks with polished shopping flows and
            sharp product storytelling.
          </p>
          <div className="hero-actions">
            <Link className="solid-link" to="/products">
              Shop Now
              <ArrowRight size={18} />
            </Link>
            <a className="ghost-link hero-glass-link" href="#featured-products">
              Explore Collection
            </a>
          </div>
          <div className="hero-trust-row">
            <span>
              <Truck size={18} />
              Express delivery
            </span>
            <span>
              <Zap size={18} />
              Limited drops
            </span>
            <span>4.9 customer rating</span>
          </div>
        </div>
      </section>

      <section className="home-strip">
        <article>
          <strong>50%</strong>
          <span>Seasonal sale</span>
        </article>
        <article>
          <strong>24h</strong>
          <span>Flash deals</span>
        </article>
        <article>
          <strong>{source === "api" ? "Live" : "Preview"}</strong>
          <span>Product feed</span>
        </article>
      </section>

      <section className="home-section" id="categories">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Explore curated departments.</h2>
          </div>
          <Link className="ghost-button" to="/products">
            Browse all
          </Link>
        </div>
        <div className="category-grid">
          {categoryCards.map((category) => (
            <Link className="category-card" key={category.name} to={`/products?category=${encodeURIComponent(category.name)}`}>
              <img src={category.image} alt={category.name} loading="lazy" />
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section" id="featured-products">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Featured products</p>
            <h2>Fresh picks with premium details.</h2>
          </div>
          <Link className="solid-button" to="/products">
            View All Products
          </Link>
        </div>
        {status === "loading" ? <ProductSkeletonGrid /> : <section className="home-products-grid">{featuredProducts.map((product) => renderProductCard(product))}</section>}
      </section>

      <section className="offers-grid">
        <article className="offer-banner primary-offer">
          <span>Limited-time offer</span>
          <h2>Up to 40% off performance essentials.</h2>
          <Link className="solid-link" to="/products">
            Claim Deal
          </Link>
        </article>
        <article className="offer-banner secondary-offer">
          <span>Members only</span>
          <h2>Free shipping on premium collections.</h2>
          <Link className="ghost-link hero-glass-link" to="/register">
            Join Now
          </Link>
        </article>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Best selling products</p>
            <h2>Trending right now.</h2>
          </div>
        </div>
        {status === "loading" ? (
          <ProductSkeletonGrid />
        ) : (
          <div className="best-selling-rail">{bestSellingProducts.map((product) => renderProductCard(product, true))}</div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Customer stories</p>
            <h2>Trusted by shoppers who care about design.</h2>
          </div>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((review) => (
            <article className="testimonial-card" key={review.name}>
              <div className="testimonial-header">
                <img src={review.image} alt={review.name} loading="lazy" />
                <div>
                  <strong>{review.name}</strong>
                  <div className="home-rating">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} size={13} fill="currentColor" />
                    ))}
                  </div>
                </div>
              </div>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="newsletter-section" id="contact">
        <div>
          <p className="eyebrow">Newsletter</p>
          <h2>Get early access to drops and private offers.</h2>
        </div>
        <form className="newsletter-form" onSubmit={handleNewsletter}>
          <Mail size={19} />
          <input type="email" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="Enter your email" />
          <button type="submit">Subscribe</button>
        </form>
      </section>

      {!isAdmin && (
        <aside className="sticky-cart-sidebar">
          <div>
            <ShoppingBag size={20} />
            <span>{cartItems.length} items</span>
          </div>
          <strong>{formatCurrency(cartTotal)}</strong>
          <button type="button" onClick={() => navigate("/cart")}>
            Open Cart
          </button>
        </aside>
      )}

      <footer className="commerce-footer">
        <div>
          <Link className="brand" to="/">
            <span className="brand-mark">LL</span>
            <span>
              <strong>Lumen Lane</strong>
              <small>Premium ecommerce</small>
            </span>
          </Link>
          <p>Modern shopping experiences for fashion, tech, accessories, beauty, and lifestyle essentials.</p>
        </div>
        <nav>
          <strong>Quick links</strong>
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <a href="#categories">Categories</a>
          <a href="#contact">Contact</a>
        </nav>
        <nav>
          <strong>Categories</strong>
          {categoryCards.slice(0, 4).map((category) => (
            <Link key={category.name} to={`/products?category=${encodeURIComponent(category.name)}`}>
              {category.name}
            </Link>
          ))}
        </nav>
        <div>
          <strong>Contact</strong>
          <p>support@lumenlane.com</p>
          <p>Hyderabad, India</p>
          <div className="social-row">
            <span>IG</span>
            <span>X</span>
            <span>YT</span>
          </div>
        </div>
        <small className="footer-copy">(c) 2026 Lumen Lane. All rights reserved.</small>
      </footer>

      <ProductQuickViewModal
        open={Boolean(quickViewProduct)}
        product={quickViewProduct}
        wished={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
        showAddToCart={!isAdmin}
        onClose={() => setQuickViewProduct(null)}
        onWishlist={toggleWishlist}
        onAddToCart={handleAddToCart}
      />
    </main>
  );
}
