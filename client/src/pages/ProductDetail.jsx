import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./ProductDetail.css";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "");
  return `₩${n.toLocaleString("ko-KR")}`;
}

function normalizeSizes(size) {
  if (Array.isArray(size)) {
    return size.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof size === "string" && size.trim()) {
    return size
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const ACCORDIONS = [
  {
    id: "shipping",
    title: "Shipping",
    body: "영업일 기준 2–4일 내 출고됩니다. 제주·도서산간은 추가 배송비가 발생할 수 있습니다.",
  },
  {
    id: "returns",
    title: "Returns",
    body: "수령 후 7일 이내 미착용·택 유지 상품에 한해 교환·반품이 가능합니다.",
  },
  {
    id: "size-guide",
    title: "Size Guide",
    body: "사이즈는 실측과 다를 수 있습니다. 고민될 때는 한 사이즈 업을 추천합니다.",
  },
];

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [openAccordion, setOpenAccordion] = useState("");
  const [toast, setToast] = useState("");
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    const fetchMe = async () => {
      try {
        const response = await fetch(apiUrl("/users/me"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setUser(null);
          return;
        }
        setUser(data.user);
      } catch (err) {
        if (err.name === "AbortError") return;
        setUser(null);
      }
    };

    fetchMe();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    const fetchProduct = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(apiUrl(`/products/${encodeURIComponent(id)}`), {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setProduct(null);
          setError(data.message || "상품을 찾을 수 없습니다.");
          return;
        }

        setProduct(data);
        const nextSizes = normalizeSizes(data.size);
        setSelectedSize(nextSizes[0] || "");
      } catch (err) {
        if (err.name === "AbortError") return;
        setProduct(null);
        setError("상품을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    refreshCartCount();
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setToast("사이즈를 선택해주세요");
      return;
    }

    if (!product) return;

    setAdding(true);
    try {
      await addToCart({
        productId: product.productId || product._id,
        size: selectedSize,
        quantity: 1,
      });
      setToast(`${product.name} (${selectedSize}) — 장바구니에 담았습니다`);
    } catch (err) {
      if (err.code === "LOGIN_REQUIRED") {
        setToast("장바구니에 담으려면 로그인이 필요합니다");
        return;
      }
      setToast(err.message || "장바구니 담기에 실패했습니다");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedSize) {
      setToast("사이즈를 선택해주세요");
      return;
    }

    if (!product || buying) return;

    setBuying(true);
    try {
      await addToCart({
        productId: product.productId || product._id,
        size: selectedSize,
        quantity: 1,
      });
      navigate("/order");
    } catch (err) {
      if (err.code === "LOGIN_REQUIRED") {
        setToast("바로구매하려면 로그인이 필요합니다");
        navigate("/login");
        return;
      }
      setToast(err.message || "바로구매에 실패했습니다");
    } finally {
      setBuying(false);
    }
  };

  const sizes = normalizeSizes(product?.size);
  const gallery = (() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.filter(Boolean).slice(0, 4);
    }
    const single = product?.image || product?.imageUrl || "";
    return single ? [single] : [];
  })();
  const image = gallery[0] || "";
  const description =
    product?.description?.trim() ||
    "Cold-ready layers for city streets and alpine trails. Built with trail-tested details and a clean STANDFAST silhouette.";

  return (
    <div className="home product-detail">
      <HomeNavbar user={user} onLogout={handleLogout} />

      <div className="pd__topbar">
        <BackLink to="/#new-arrivals" label="Back" className="back-link-wrap--flush" />
        <div className="pd__crumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/#new-arrivals">Shop</Link>
          <span>/</span>
          <span>{product?.name || "Product"}</span>
        </div>
      </div>

      {loading ? (
        <p className="pd__status">상품을 불러오는 중…</p>
      ) : error || !product ? (
        <div className="pd__status-block">
          <p className="pd__status">{error || "상품을 찾을 수 없습니다."}</p>
          <Link to="/" className="pd__back-link">
            ← 메인으로
          </Link>
        </div>
      ) : (
        <div className="pd__layout">
          <section className="pd__gallery" aria-label="Product images">
            {gallery.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={`pd__gallery-item pd__gallery-item--${index % 4}`}
              >
                <img
                  src={src}
                  alt={`${product.name} view ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </div>
            ))}
          </section>

          <aside className="pd__buy">
            <div className="pd__buy-inner">
              <p className="pd__category">{product.category}</p>
              <h1 className="pd__title">{product.name}</h1>
              <p className="pd__price">{formatPrice(product.price)}</p>

              <div className="pd__swatch-row" aria-label="Color">
                <button type="button" className="pd__swatch is-active" aria-label="Selected color">
                  <img src={image} alt="" />
                </button>
              </div>

              <div className="pd__field">
                <div className="pd__field-label">
                  <span>Size</span>
                  {selectedSize ? <strong>{selectedSize}</strong> : null}
                </div>
                <div className="pd__sizes" role="listbox" aria-label="Select size">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={selectedSize === size}
                      className={`pd__size ${selectedSize === size ? "is-active" : ""}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="pd__btn pd__btn--cart"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding ? "ADDING…" : "ADD TO CART"}
              </button>
              <button
                type="button"
                className="pd__btn pd__btn--buy"
                onClick={handleBuyNow}
                disabled={adding || buying}
              >
                {buying ? "PROCESSING…" : "BUY IT NOW"}
              </button>

              <p className="pd__desc">{description}</p>

              <div className="pd__accordions">
                {ACCORDIONS.map((item) => {
                  const isOpen = openAccordion === item.id;
                  return (
                    <div key={item.id} className={`pd__acc ${isOpen ? "is-open" : ""}`}>
                      <button
                        type="button"
                        className="pd__acc-trigger"
                        aria-expanded={isOpen}
                        onClick={() => setOpenAccordion(isOpen ? "" : item.id)}
                      >
                        <span>{item.title}</span>
                        <span className="pd__acc-icon" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen ? <p className="pd__acc-body">{item.body}</p> : null}
                    </div>
                  );
                })}
              </div>

              <p className="pd__sku">SKU: {product.productId}</p>
            </div>
          </aside>
        </div>
      )}

      <footer className="pd__footer">
        <p>© STANDFAST. Cold weather gear for city streets and alpine trails.</p>
        <div className="pd__footer-links">
          <a href="#shipping">Shipping</a>
          <a href="#returns">Returns</a>
          <Link to="/">Shop</Link>
        </div>
      </footer>

      {toast ? (
        <div className="pd__toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default ProductDetail;
