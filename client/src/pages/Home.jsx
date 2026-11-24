import { useEffect, useState } from "react";
import { apiUrl } from "../api";
import "./Home.css";
import {
  CATEGORIES,
  FEATURE_IMAGE,
  HERO_IMAGE,
} from "./home/homeData";
import HomeNavbar from "./home/HomeNavbar";
import NewsletterForm from "./home/NewsletterForm";
import ProductCard from "./home/ProductCard";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "");
  return n.toLocaleString("ko-KR");
}

function mapProductForCard(product) {
  const image =
    (Array.isArray(product.images) && product.images[0]) ||
    product.image ||
    product.imageUrl ||
    "";

  return {
    id: product._id || product.productId,
    name: product.name,
    price: formatPrice(product.price),
    stock: true,
    rating: 5,
    image,
  };
}

function Home() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      } catch (error) {
        if (error.name === "AbortError") return;
        setUser(null);
      }
    };

    fetchMe();

    return () => controller.abort();
  }, []);

  // 메인: 전체 상품 조회 (GET /products?all=true)
  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError("");

      try {
        const response = await fetch(apiUrl("/products?all=true"), {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setProducts([]);
          setProductsError(data.message || "상품을 불러오지 못했습니다.");
          return;
        }

        const list = Array.isArray(data.products) ? data.products : [];
        setProducts(list.map(mapProductForCard));
      } catch (error) {
        if (error.name === "AbortError") return;
        setProducts([]);
        setProductsError("상품을 불러오지 못했습니다.");
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();

    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("cart-updated"));
  };

  return (
    <div className="home">
      <HomeNavbar user={user} onLogout={handleLogout} />

      <section className="home__hero">
        <img
          className="home__hero-image"
          src={HERO_IMAGE}
          alt="Cold weather outerwear in snowy forest"
          fetchPriority="high"
          decoding="async"
        />
        <div className="home__hero-overlay" />
        <h1 className="home__hero-title">COLD WEATHER ARCHIVES.</h1>
        <div className="home__hero-dots" aria-hidden="true">
          <span className="home__hero-dot is-active" />
          <span className="home__hero-dot" />
          <span className="home__hero-dot" />
        </div>
      </section>

      <main>
        <section id="new-arrivals" className="home__section">
          <h2 className="home__section-title">NEW ARRIVALS</h2>
          {productsLoading ? (
            <p className="home__products-status">상품을 불러오는 중…</p>
          ) : productsError ? (
            <p className="home__products-status">{productsError}</p>
          ) : products.length === 0 ? (
            <p className="home__products-status">등록된 상품이 없습니다.</p>
          ) : (
            <div className="home__product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section id="down" className="home__feature">
          <div className="home__feature-media">
            <img
              src={FEATURE_IMAGE}
              alt="Down collection on the trail"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="home__feature-copy">
            <h2>DOWN COLLECTION</h2>
            <p>
              Built for deep cold and long trails. Lightweight warmth, storm-ready shells, and
              trail-tested details for every winter route.
            </p>
            <div className="home__feature-stats">
              <div>
                <strong>700</strong>
                <span>Fill Power</span>
              </div>
              <div>
                <strong>RDS</strong>
                <span>Certified</span>
              </div>
              <div>
                <strong>-30°C</strong>
                <span>Rated</span>
              </div>
            </div>
            <a href="#categories" className="home__btn">
              SHOP ALL
            </a>
          </div>
        </section>

        <section id="categories" className="home__section">
          <h2 className="home__section-title">SHOP BY CATEGORY</h2>
          <div className="home__category-grid">
            {CATEGORIES.map((category) => (
              <a key={category.id} href={`#${category.id}`} className="home__category">
                <img
                  src={category.image}
                  alt={category.label}
                  loading="lazy"
                  decoding="async"
                />
                <span>{category.label}</span>
              </a>
            ))}
          </div>
        </section>

        <section id="newsletter" className="home__newsletter">
          <h2>NEWSLETTER</h2>
          <p>Winter drops, restocks, and trail notes — straight to your inbox.</p>
          <NewsletterForm />
        </section>
      </main>

      <footer className="home__footer">
        <div className="home__footer-grid">
          <div>
            <p className="home__footer-brand">STANDFAST</p>
            <p>Cold weather gear for city streets and alpine trails.</p>
            <p>support@standfast.shop</p>
          </div>
          <div>
            <h3>SITE</h3>
            <a href="#new-arrivals">Shop</a>
            <a href="#down">Brand</a>
            <a href="#categories">Lookbook</a>
          </div>
          <div>
            <h3>SUPPORT</h3>
            <a href="#newsletter">Help</a>
            <a href="#newsletter">Shipping</a>
            <a href="#newsletter">Returns</a>
          </div>
          <div>
            <h3>SOCIAL</h3>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">
              Facebook
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
