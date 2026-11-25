import { Link, useLocation } from "react-router-dom";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import { apiUrl } from "../api";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";
import "./Subscribe.css";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "₩10,000";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function SubscribeComplete() {
  const location = useLocation();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);

  const price = location.state?.price ?? 10000;
  const expiresAt = location.state?.expiresAt;
  const expireLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("ko-KR")
    : "결제일로부터 30일";

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

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

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    refreshCartCount();
  };

  return (
    <div className="home cart-page order-page subscribe-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/" label="Back" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Subscribe Complete</h1>
          <p className="cart__sub">월간 구독이 시작되었습니다.</p>
        </header>

        <div className="order__complete">
          <p className="order__complete-label">Membership</p>
          <p className="order__complete-no">월간 멤버십</p>
          <p className="order__complete-copy">
            {formatPrice(price)} 결제가 확인되었습니다. 이용 기간은{" "}
            <strong>{expireLabel}</strong>까지입니다.
          </p>
          <ul className="subscribe__complete-benefits">
            <li>월 3회 무료 교환·반품</li>
            <li>주 1회 추천 코디·상품 메신저 전송</li>
            <li>1만원 쿠폰 박스 (5천·3천·2천)</li>
          </ul>
          <div className="order__complete-actions">
            <div className="order__complete-btns">
              <Link to="/" className="cart__btn cart__btn--dark">
                CONTINUE SHOPPING
              </Link>
              <Link to="/orders" className="cart__btn cart__btn--outline">
                주문 내역
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscribeComplete;
