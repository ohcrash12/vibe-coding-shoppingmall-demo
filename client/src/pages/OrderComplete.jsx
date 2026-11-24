import { Link, useLocation, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";

function OrderComplete() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);

  const order = location.state?.order;
  const saveError = location.state?.saveError || "";
  const orderNumber = order?.orderNumber || searchParams.get("no") || "";

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
      <BackLink to="/" label="Back" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Order Complete</h1>
          <p className="cart__sub">주문이 정상적으로 접수되었습니다.</p>
        </header>

        <div className="order__complete">
          <p className="order__complete-label">Order Number</p>
          <p className="order__complete-no">{orderNumber || "확인 중"}</p>
          {saveError ? (
            <p className="order__complete-error">
              결제는 확인됐지만 주문 저장 중 문제가 있었습니다: {saveError}
            </p>
          ) : (
            <p className="order__complete-copy">
              주문이 정상적으로 접수되었습니다. 주문 내역에서 상태를 확인할 수 있습니다.
            </p>
          )}
          <div className="order__complete-actions">
            <div className="order__complete-btns">
              <Link to="/" className="cart__btn cart__btn--dark">
                CONTINUE SHOPPING
              </Link>
              <Link to="/orders" className="cart__btn cart__btn--outline">
                주문 내역
              </Link>
            </div>
            <Link to="/cart" className="cart__keep">
              View cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderComplete;
