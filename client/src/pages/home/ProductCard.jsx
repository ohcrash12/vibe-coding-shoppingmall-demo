import { Link } from "react-router-dom";

function StarRating({ value }) {
  return (
    <div className="home__stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? "is-on" : ""}>
          ★
        </span>
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const to = `/products/${encodeURIComponent(product.id)}`;

  return (
    <article className="home__product">
      <Link to={to} className="home__product-link">
        <div className="home__product-media">
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        </div>
        <StarRating value={product.rating} />
        <h3 className="home__product-name">{product.name}</h3>
        <p className="home__product-meta">
          <span>₩{product.price}</span>
          <span className={product.stock ? "is-stock" : "is-out"}>
            {product.stock ? "In Stock" : "Sold Out"}
          </span>
        </p>
      </Link>
    </article>
  );
}

export default ProductCard;
