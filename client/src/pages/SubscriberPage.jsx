import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";
import "./Subscribe.css";

const COUPONS = [
  { id: "c5", amount: 5000, label: "5,000원 쿠폰", note: "3만원 이상 구매 시" },
  { id: "c3", amount: 3000, label: "3,000원 쿠폰", note: "2만원 이상 구매 시" },
  { id: "c2", amount: 2000, label: "2,000원 쿠폰", note: "1만원 이상 구매 시" },
];

const COORDI_PRESETS = [
  {
    id: "city-cold",
    title: "City Cold Layering",
    tag: "도심 캐주얼",
    copy: "가벼운 아우터에 니트·데님을 겹쳐 한낮과 저녁 기온 차를 커버하는 코디입니다.",
    tones: ["#2c3340", "#6b5a4a", "#c4b8a8"],
  },
  {
    id: "trail-weekend",
    title: "Weekend Trail Set",
    tag: "주말 아웃도어",
    copy: "방풍 쉘과 카고·비니로 짧은 트레킹과 카페 스톱을 이어가는 조합입니다.",
    tones: ["#1f3a2f", "#4a5c48", "#b7c4b0"],
  },
];

const BENEFITS = [
  "월 3회 무료 교환·반품",
  "주 1회 추천 코디·상품 메신저 전송",
  "구매 시 사용 가능한 1만원 쿠폰박스",
];

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "-");
  return `₩${n.toLocaleString("ko-KR")}`;
}

function getRemainingDays(expiresAt) {
  if (!expiresAt) return null;
  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function SubscriberPage() {
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      setError("LOGIN_REQUIRED");
      return;
    }

    const controller = new AbortController();

    const bootstrap = async () => {
      try {
        const meRes = await fetch(apiUrl("/users/me"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const meData = await meRes.json().catch(() => ({}));

        if (!meRes.ok) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setUser(null);
          setError("LOGIN_REQUIRED");
          return;
        }

        setUser(meData.user);
        setError("");

        setProductsLoading(true);
        const productsRes = await fetch(apiUrl("/products?all=true"), {
          signal: controller.signal,
        });
        const productsData = await productsRes.json().catch(() => ({}));
        const list = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData.products)
            ? productsData.products
            : [];
        setProducts(list);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError("구독자 페이지를 불러오지 못했습니다.");
      } finally {
        setProductsLoading(false);
        setLoading(false);
      }
    };

    bootstrap();
    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    refreshCartCount();
  };

  const isSubscriber = user?.user_type === "subscriber";
  const daysLeft = getRemainingDays(user?.subscriptionExpiresAt);
  const cycleDays = 30;
  const progress =
    daysLeft === null ? 0 : Math.round(((cycleDays - daysLeft) / cycleDays) * 100);
  const couponTotal = COUPONS.reduce((sum, c) => sum + c.amount, 0);
  const recommendProducts = products.slice(0, 4);

  return (
    <div className="home cart-page order-page subscribe-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/user" label="Back to my page" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Subscriber</h1>
          <p className="cart__sub">구독 혜택 · 추천 코디 · 쿠폰 박스</p>
        </header>

        {error === "LOGIN_REQUIRED" ? (
          <div className="cart__empty">
            <p>구독자 페이지를 보려면 로그인이 필요합니다.</p>
            <Link to="/login" className="cart__btn cart__btn--dark">
              LOGIN
            </Link>
          </div>
        ) : loading ? (
          <p className="cart__status">구독자 페이지를 불러오는 중…</p>
        ) : error ? (
          <p className="cart__status">{error}</p>
        ) : !isSubscriber ? (
          <div className="member-sub__gate">
            <section className="order__panel">
              <h2 className="order__panel-title">아직 구독자가 아닙니다</h2>
              <p className="member-sub__gate-copy">
                월 ₩10,000 구독으로 아래 혜택을 이용할 수 있습니다.
              </p>
              <ul className="member-sub__gate-list">
                {BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/subscribe" className="cart__btn cart__btn--buy">
                구독 가입하기
              </Link>
            </section>
          </div>
        ) : (
          <div className="member-sub">
            <section className="member-sub__kpi">
              <article className="member-sub__card">
                <p className="member-sub__label">구독 서비스 남은 기간</p>
                <p className="member-sub__value">
                  {daysLeft === null ? "-" : `D-${daysLeft}`}
                </p>
                <p className="member-sub__note">
                  결제 후 {cycleDays}일 이용
                  {user.subscriptionExpiresAt
                    ? ` · 만료 ${new Date(user.subscriptionExpiresAt).toLocaleDateString("ko-KR")}`
                    : ""}
                </p>
                <div className="member-sub__progress" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
              </article>

              <article className="member-sub__card">
                <p className="member-sub__label">구독 상태</p>
                <p className="member-sub__value">구독중</p>
                <p className="member-sub__note">월간 멤버십 활성</p>
              </article>

              <article className="member-sub__card">
                <p className="member-sub__label">쿠폰 박스</p>
                <p className="member-sub__value">{formatPrice(couponTotal)}</p>
                <p className="member-sub__note">5천 · 3천 · 2천 / 3장</p>
              </article>
            </section>

            <section className="member-sub__split">
              <article className="order__panel member-sub__panel">
                <h2 className="order__panel-title">추천 받은 코디</h2>
                <p className="member-sub__panel-sub">시즌 무드에 맞춘 스타일링 가이드</p>
                <ul className="member-sub__coordi-list">
                  {COORDI_PRESETS.map((coordi) => (
                    <li key={coordi.id} className="member-sub__coordi">
                      <div className="member-sub__tones" aria-hidden="true">
                        {coordi.tones.map((tone) => (
                          <span key={tone} style={{ background: tone }} />
                        ))}
                      </div>
                      <div>
                        <p className="member-sub__tag">{coordi.tag}</p>
                        <h3>{coordi.title}</h3>
                        <p>{coordi.copy}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="order__panel member-sub__panel">
                <h2 className="order__panel-title">1만원 쿠폰 박스</h2>
                <p className="member-sub__panel-sub">
                  구독 혜택 쿠폰 3장 · 합계 {formatPrice(couponTotal)}
                </p>
                <ul className="member-sub__coupons">
                  {COUPONS.map((coupon) => (
                    <li key={coupon.id} className="member-sub__coupon">
                      <div className="member-sub__coupon-amount">
                        <span>COUPON</span>
                        <strong>{formatPrice(coupon.amount)}</strong>
                      </div>
                      <div className="member-sub__coupon-meta">
                        <p>{coupon.label}</p>
                        <p>{coupon.note}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="order__panel member-sub__panel">
              <h2 className="order__panel-title">추천 상품 목록</h2>
              <p className="member-sub__panel-sub">코디에 바로 연결할 수 있는 추천 아이템</p>
              {productsLoading ? (
                <p className="cart__status">추천 상품을 불러오는 중…</p>
              ) : recommendProducts.length === 0 ? (
                <p className="cart__status">추천할 상품이 없습니다.</p>
              ) : (
                <ul className="member-sub__products">
                  {recommendProducts.map((product) => {
                    const imageSrc =
                      (Array.isArray(product.images) && product.images[0]) ||
                      product.image ||
                      product.imageUrl ||
                      "";
                    const detailId = product.productId || product._id;

                    return (
                      <li key={product._id || detailId} className="member-sub__product">
                        {imageSrc ? (
                          <img src={imageSrc} alt={product.name || "상품"} loading="lazy" />
                        ) : (
                          <div className="member-sub__thumb-empty" aria-hidden="true" />
                        )}
                        <div>
                          <Link to={`/products/${encodeURIComponent(detailId)}`}>
                            {product.name}
                          </Link>
                          <p>{product.category || "-"}</p>
                          <strong>{formatPrice(product.price)}</strong>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriberPage;
