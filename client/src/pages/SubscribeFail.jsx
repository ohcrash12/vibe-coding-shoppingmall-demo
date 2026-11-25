import { Link, useLocation } from "react-router-dom";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import { apiUrl } from "../api";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";

function SubscribeFail() {
  const location = useLocation();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);

  const failMessage =
    location.state?.message || "결제가 취소되었거나 실패했습니다.";
  const merchantUid = location.state?.merchantUid || "";

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
    <div className="home cart-page order-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/subscribe" label="Back to subscribe" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Subscribe Failed</h1>
          <p className="cart__sub">구독 결제가 완료되지 않았습니다.</p>
        </header>

        <div className="order__complete order__fail">
          <p className="order__complete-label">Payment Status</p>
          <p className="order__complete-no">결제 실패</p>
          <p className="order__complete-error">{failMessage}</p>
          {merchantUid ? (
            <p className="order__fail-meta">참고번호: {merchantUid}</p>
          ) : null}
          <div className="order__complete-actions">
            <div className="order__complete-btns">
              <Link to="/subscribe" className="cart__btn cart__btn--dark">
                다시 구독하기
              </Link>
              <Link to="/" className="cart__btn cart__btn--outline">
                홈으로
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubscribeFail;
