import { useEffect, useMemo, useState } from "react";
import { Heart, Search, ShoppingBag, SlidersHorizontal, Star, X, Zap } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProducts } from "../hooks/useProducts";
import { formatCurrency } from "../utils/currency";
import { isAdminRole } from "../utils/roles";

const brandByCategory = {
  Audio: "NovaBeat",
  Workspace: "AeroDesk",
  Entertainment: "LumaTech",
  Wearables: "LunaLab",
  Travel: "Atlas Co.",
  Lighting: "Prism Home",
  Accessories: "Vanta Supply",
  Kitchen: "Solstice",
  Home: "Terra Living"
};

const colorOptions = ["Black", "White", "Blue", "Gold", "Green", "Silver"];
const sizeOptions = ["XS", "S", "M", "L", "XL", "One Size"];
const clothingCategories = ["Clothes", "Clothing", "Fashion", "Apparel"];

function enrichProduct(product, index) {
  const discount = [15, 20, 25, 30, 35][index % 5];
  const price = Number(product.price);
  const rating = Number((4.2 + (index % 8) * 0.09).toFixed(1));
  return {
    ...product,
    brand: product.brand || brandByCategory[product.category] || "Lumen Lane",
    discount,
    originalPrice: Number((price / (1 - discount / 100)).toFixed(2)),
    rating,
    reviews: 120 + index * 37,
    badge: index % 3 === 0 ? "New" : index % 3 === 1 ? "Sale" : "Trending",
    colors: colorOptions.slice(index % 3, (index % 3) + 3),
    sizes: index % 2 === 0 ? ["S", "M", "L", "XL"] : ["One Size", "M", "L"],
    popularity: 1000 - index * 31,
    createdRank: index
  };
}

function ProductsSkeleton() {
  return (
    <section className="premium-products-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <article className="premium-product-card product-skeleton" key={index}>
          <div />
          <span />
          <strong />
          <p />
        </article>
      ))}
    </section>
  );
}

export default function ProductsPage() {
  const { products, categories, source, status } = useProducts();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(() => searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") || "All");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedRating, setSelectedRating] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [selectedColor, setSelectedColor] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [maxPrice, setMaxPrice] = useState(500);
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isAdmin = isAdminRole(user?.role);
  const pageSize = 8;

  const enrichedProducts = useMemo(() => products.map(enrichProduct), [products]);
  const brands = useMemo(() => [...new Set(enrichedProducts.map((product) => product.brand))], [enrichedProducts]);
  const highestPrice = useMemo(() => Math.max(500, ...enrichedProducts.map((product) => Math.ceil(Number(product.price)))), [enrichedProducts]);

  useEffect(() => {
    const category = searchParams.get("category") || "All";
    const search = searchParams.get("search") || "";
    setSelectedCategory(category);
    setSearchText(search);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    setMaxPrice(highestPrice);
  }, [highestPrice]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const nextProducts = enrichedProducts.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch) ||
        product.brand.toLowerCase().includes(normalizedSearch);
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesRating = selectedRating === "All" || product.rating >= Number(selectedRating);
      const matchesAvailability = availability === "All" || (availability === "In Stock" ? product.stock > 0 : product.stock <= 0);
      const matchesColor = selectedColor === "All" || product.colors.includes(selectedColor);
      const matchesSize = selectedSize === "All" || product.sizes.includes(selectedSize);
      const matchesPrice = Number(product.price) <= maxPrice;
      return matchesSearch && matchesCategory && matchesBrand && matchesRating && matchesAvailability && matchesColor && matchesSize && matchesPrice;
    });

    return [...nextProducts].sort((a, b) => {
      if (sortBy === "price-low") return Number(a.price) - Number(b.price);
      if (sortBy === "price-high") return Number(b.price) - Number(a.price);
      if (sortBy === "latest") return a.createdRank - b.createdRank;
      if (sortBy === "rated") return b.rating - a.rating;
      return b.popularity - a.popularity;
    });
  }, [availability, enrichedProducts, maxPrice, searchText, selectedBrands, selectedCategory, selectedColor, selectedRating, selectedSize, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);
  const recommendedProducts = filteredProducts.filter((product) => activeProduct && product.category === activeProduct.category && product.id !== activeProduct.id).slice(0, 4);
  const activeProductHasSizes = activeProduct ? clothingCategories.includes(activeProduct.category) : false;

  useEffect(() => {
    setPage(1);
  }, [availability, maxPrice, searchText, selectedBrands, selectedCategory, selectedColor, selectedRating, selectedSize, sortBy]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  };

  const toggleBrand = (brand) => {
    setSelectedBrands((current) => (current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]));
  };

  const toggleWishlist = (productId) => {
    setWishlist((current) => (current.includes(productId) ? current.filter((item) => item !== productId) : [...current, productId]));
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
      showToast("Admin accounts cannot add items to the cart.", "error");
      return;
    }

    try {
      await addToCart(product, quantity);
      showToast(`${product.name} added to cart.`);
    } catch (error) {
      showToast(error.response?.data?.message || error.message || "Unable to add product to cart.", "error");
    }
  };

  const openDetails = (product) => {
    setActiveProduct(product);
    setSelectedImage(product.imageUrl);
    setQuantity(1);
  };

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedBrands([]);
    setSelectedRating("All");
    setAvailability("All");
    setSelectedColor("All");
    setSelectedSize("All");
    setMaxPrice(highestPrice);
    setSortBy("popular");
  };

  return (
    <main className="page premium-product-page">
      {toast && <div className={`floating-toast ${toast.type}`}>{toast.message}</div>}

      <section className="product-hero-bar">
        <div>
          <p className="eyebrow">Premium catalog</p>
          <h1>Shop products with precision filters and fast actions.</h1>
          <p>{source === "api" ? "Live inventory from backend API." : "Preview catalog shown until backend products are available."}</p>
        </div>
        <form className="product-search-panel" onSubmit={(event) => event.preventDefault()}>
          <Search size={19} />
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search products, brands, categories" />
        </form>
      </section>

      <section className="catalog-toolbar">
        <button className="ghost-button mobile-filter-toggle" type="button" onClick={() => setMobileFiltersOpen((current) => !current)}>
          <SlidersHorizontal size={18} />
          Filters
        </button>
        <span>{filteredProducts.length} products found</span>
        <label>
          Sort by
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="popular">Most Popular</option>
            <option value="price-low">Price Low to High</option>
            <option value="price-high">Price High to Low</option>
            <option value="latest">Latest Products</option>
            <option value="rated">Highest Rated</option>
          </select>
        </label>
      </section>

      <section className="premium-catalog-layout">
        <aside className={`filters-sidebar${mobileFiltersOpen ? " open" : ""}`}>
          <div className="filter-sidebar-header">
            <strong>Filters</strong>
            <button type="button" onClick={clearFilters}>Clear</button>
          </div>

          <div className="filter-group">
            <span>Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="All">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span>Price range</span>
            <input type="range" min="0" max={highestPrice} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
            <strong>Up to {formatCurrency(maxPrice)}</strong>
          </div>

          <div className="filter-group">
            <span>Brand</span>
            <div className="filter-check-list">
              {brands.map((brand) => (
                <label key={brand}>
                  <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} />
                  {brand}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span>Ratings</span>
            <select value={selectedRating} onChange={(event) => setSelectedRating(event.target.value)}>
              <option value="All">All Ratings</option>
              <option value="4.8">4.8 and above</option>
              <option value="4.5">4.5 and above</option>
              <option value="4.2">4.2 and above</option>
            </select>
          </div>

          <div className="filter-group">
            <span>Availability</span>
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="All">All</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div className="filter-group">
            <span>Color</span>
            <div className="swatch-row">
              <button className={selectedColor === "All" ? "active" : ""} type="button" onClick={() => setSelectedColor("All")}>All</button>
              {colorOptions.map((color) => (
                <button className={selectedColor === color ? "active" : ""} key={color} type="button" onClick={() => setSelectedColor(color)}>{color}</button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span>Size</span>
            <div className="size-row">
              {["All", ...sizeOptions].map((size) => (
                <button className={selectedSize === size ? "active" : ""} key={size} type="button" onClick={() => setSelectedSize(size)}>{size}</button>
              ))}
            </div>
          </div>
        </aside>

        <div>
          {status === "loading" ? (
            <ProductsSkeleton />
          ) : visibleProducts.length === 0 ? (
            <div className="premium-empty-state">
              <strong>No matching products</strong>
              <p>Try clearing filters or searching another product line.</p>
              <button className="solid-button" type="button" onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <section className="premium-products-grid">
              {visibleProducts.map((product) => (
                <article className="premium-product-card" key={product.id}>
                  <div className="premium-card-media">
                    <img src={product.imageUrl} alt={product.name} loading="lazy" />
                    <span className={`product-badge ${product.badge.toLowerCase()}`}>{product.badge}</span>
                    <button className={`product-wishlist-button${wishlist.includes(product.id) ? " active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label="Wishlist">
                      <Heart size={18} fill={wishlist.includes(product.id) ? "currentColor" : "none"} />
                    </button>
                    <button className="quick-view-pill" type="button" onClick={() => openDetails(product)}>Quick View</button>
                  </div>
                  <div className="premium-card-body">
                    <span>{product.brand}</span>
                    <h2>{product.name}</h2>
                    <div className="home-rating">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={14} fill="currentColor" />
                      ))}
                      <span>{product.rating} ({product.reviews})</span>
                    </div>
                    <div className="price-row">
                      <strong>{formatCurrency(product.price)}</strong>
                      <del>{formatCurrency(product.originalPrice)}</del>
                      <em>{product.discount}% off</em>
                    </div>
                    <p className={product.stock > 0 ? "stock-text" : "stock-text out"}>{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
                    <div className="premium-card-actions">
                      {!isAdmin && (
                        <button className="solid-button" type="button" disabled={product.stock <= 0} onClick={() => handleAddToCart(product)}>
                          <ShoppingBag size={17} />
                          Add to Cart
                        </button>
                      )}
                      <button className="ghost-button" type="button" onClick={() => openDetails(product)}>Details</button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {filteredProducts.length > pageSize && (
            <div className="pagination-row">
              <button className="ghost-button" type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="ghost-button" type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          )}
        </div>
      </section>

      {activeProduct && (
        <div className="modal-backdrop product-detail-backdrop" role="presentation" onMouseDown={() => setActiveProduct(null)}>
          <article className="product-detail-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button quick-view-close" type="button" onClick={() => setActiveProduct(null)} aria-label="Close product details">
              <X size={19} />
            </button>
            <section className="detail-gallery">
              <div className="detail-main-image">
                <img src={selectedImage} alt={activeProduct.name} />
              </div>
              <div className="detail-thumbs">
                {[activeProduct.imageUrl, ...activeProduct.colors.map((color) => activeProduct.imageUrl)].slice(0, 4).map((image, index) => (
                  <button className={selectedImage === image ? "active" : ""} key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(image)}>
                    <img src={image} alt={`${activeProduct.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            </section>
            <section className="detail-content">
              <p className="eyebrow">{activeProduct.brand}</p>
              <h2>{activeProduct.name}</h2>
              <p>{activeProduct.description}</p>
              <div className="home-rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={16} fill="currentColor" />
                ))}
                <span>{activeProduct.rating} rating with {activeProduct.reviews} reviews</span>
              </div>
              <div className="price-row detail-price-row">
                <strong>{formatCurrency(activeProduct.price)}</strong>
                <del>{formatCurrency(activeProduct.originalPrice)}</del>
                <em>{activeProduct.discount}% off</em>
              </div>
              <div className="detail-options">
                <span>Colors</span>
                <div className="swatch-row">
                  {activeProduct.colors.map((color) => <button key={color} type="button">{color}</button>)}
                </div>
                {activeProductHasSizes && (
                  <>
                    <span>Sizes</span>
                    <div className="size-row">
                      {activeProduct.sizes.map((size) => <button key={size} type="button">{size}</button>)}
                    </div>
                  </>
                )}
              </div>
              <ul className="details-list">
                <li>Premium grade finish with carefully curated materials.</li>
                <li>Fast delivery, secure packaging, and responsive support.</li>
                <li>Category: {activeProduct.category}</li>
              </ul>
              <div className="quantity-selector">
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))}>-</button>
                <strong>{quantity}</strong>
                <button type="button" onClick={() => setQuantity((current) => current + 1)}>+</button>
              </div>
              <div className="sticky-mobile-product-actions">
                {!isAdmin && (
                  <>
                    <button className="solid-button" type="button" onClick={() => handleAddToCart(activeProduct)}>Add to Cart</button>
                    <Link className="ghost-button" to="/cart">Buy Now</Link>
                  </>
                )}
                <button className="ghost-button icon-text-button" type="button" onClick={() => toggleWishlist(activeProduct.id)}>
                  <Heart size={18} fill={wishlist.includes(activeProduct.id) ? "currentColor" : "none"} />
                  Wishlist
                </button>
              </div>
            </section>
            {recommendedProducts.length > 0 && (
              <section className="recommended-products full-span">
                <h3>Recommended products</h3>
                <div>
                  {recommendedProducts.map((product) => (
                    <button key={product.id} type="button" onClick={() => openDetails(product)}>
                      <img src={product.imageUrl} alt={product.name} />
                      <span>{product.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      )}
    </main>
  );
}
