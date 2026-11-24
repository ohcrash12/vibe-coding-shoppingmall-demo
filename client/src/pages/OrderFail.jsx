import { Link, useLocation } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";

function OrderFail() {
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
      <BackLink to="/order" label="Back to checkout" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Order Failed</h1>
          <p className="cart__sub">주문이 완료되지 않았습니다.</p>
        </header>

        <div className="order__complete order__fail">
          <p className="order__complete-label">Payment Status</p>
          <p className="order__complete-no">결제 실패</p>
          <p className="order__complete-error">{failMessage}</p>
          {merchantUid ? (
            <p className="order__fail-meta">참고번호: {merchantUid}</p>
          ) : null}
          <p className="order__complete-copy">
            결제가 완료되지 않아 주문이 생성되지 않았습니다. 장바구니는 그대로
            유지됩니다. 다시 시도해 주세요.
          </p>
          <div className="order__complete-actions">
            <div className="order__complete-btns">
              <Link to="/order" className="cart__btn cart__btn--dark">
                다시 결제하기
              </Link>
              <Link to="/cart" className="cart__btn cart__btn--outline">
                장바구니
              </Link>
            </div>
            <Link to="/" className="cart__keep">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderFail;
