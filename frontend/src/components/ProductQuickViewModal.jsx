import { Heart, ShoppingBag, Star, X } from "lucide-react";
import { formatCurrency } from "../utils/currency";

export default function ProductQuickViewModal({ product, open, wished, showAddToCart = true, onClose, onWishlist, onAddToCart }) {
  if (!open || !product) {
    return null;
  }

  return (
    <div className="modal-backdrop quick-view-backdrop" role="presentation" onMouseDown={onClose}>
      <article className="quick-view-modal" role="dialog" aria-modal="true" aria-labelledby="quick-view-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button quick-view-close" type="button" onClick={onClose} aria-label="Close quick view">
          <X size={19} />
        </button>
        <div className="quick-view-image-wrap">
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
          <span>{product.category}</span>
        </div>
        <div className="quick-view-content">
          <p className="eyebrow">Quick view</p>
          <h2 id="quick-view-title">{product.name}</h2>
          <div className="home-rating">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={16} fill="currentColor" />
            ))}
            <span>4.8</span>
          </div>
          <p>{product.description}</p>
          <strong className="quick-view-price">{formatCurrency(product.price)}</strong>
          <div className="quick-view-actions">
            {showAddToCart && (
              <button className="solid-button" type="button" onClick={() => onAddToCart(product)}>
                <ShoppingBag size={18} />
                Add to Cart
              </button>
            )}
            <button className={`ghost-button icon-text-button${wished ? " active" : ""}`} type="button" onClick={() => onWishlist(product.id)}>
              <Heart size={18} fill={wished ? "currentColor" : "none"} />
              Wishlist
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
