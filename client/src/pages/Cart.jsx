import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "");
  return `₩${n.toLocaleString("ko-KR")}`;
}

function Cart() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      setError("LOGIN_REQUIRED");
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
          setError("LOGIN_REQUIRED");
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

  const loadCart = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setItems([]);
      setTotalPrice(0);
      setError("LOGIN_REQUIRED");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/carts"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setItems([]);
        setTotalPrice(0);
        setError(data.message || "장바구니를 불러오지 못했습니다.");
        return;
      }

      setItems(Array.isArray(data.cart?.items) ? data.cart.items : []);
      setTotalPrice(Number(data.totalPrice) || 0);
      await refreshCartCount();
    } catch {
      setItems([]);
      setTotalPrice(0);
      setError("장바구니를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    setItems([]);
    setTotalPrice(0);
    refreshCartCount();
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
  });

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    setBusyId(itemId);

    try {
      const response = await fetch(apiUrl(`/carts/items/${encodeURIComponent(itemId)}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "수량 변경에 실패했습니다.");
        return;
      }

      setItems(Array.isArray(data.cart?.items) ? data.cart.items : []);
      setTotalPrice(Number(data.totalPrice) || 0);
      await refreshCartCount();
    } catch {
      setError("수량 변경에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const removeItem = async (itemId) => {
    setBusyId(itemId);

    try {
      const response = await fetch(apiUrl(`/carts/items/${encodeURIComponent(itemId)}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "삭제에 실패했습니다.");
        return;
      }

      setItems(Array.isArray(data.cart?.items) ? data.cart.items : []);
      setTotalPrice(Number(data.totalPrice) || 0);
      await refreshCartCount();
    } catch {
      setError("삭제에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="home cart-page">
      <HomeNavbar user={user} onLogout={handleLogout} />

      <BackLink to="/" label="Back" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Shopping Bag</h1>
          <p className="cart__sub">
            {loading ? "불러오는 중…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {error === "LOGIN_REQUIRED" ? (
          <div className="cart__empty">
            <p>장바구니를 보려면 로그인이 필요합니다.</p>
            <Link to="/login" className="cart__btn cart__btn--dark">
              LOGIN
            </Link>
          </div>
        ) : loading ? (
          <p className="cart__status">장바구니를 불러오는 중…</p>
        ) : error ? (
          <p className="cart__status">{error}</p>
        ) : items.length === 0 ? (
          <div className="cart__empty">
            <p>장바구니가 비어 있습니다.</p>
            <Link to="/#new-arrivals" className="cart__btn cart__btn--dark">
              CONTINUE SHOPPING
            </Link>
          </div>
        ) : (
          <div className="cart__layout">
            <ul className="cart__list">
              {items.map((item) => {
                const itemId = item._id;
                const lineTotal = Number(item.price) * Number(item.quantity);
                const busy = busyId === itemId;

                return (
                  <li key={itemId} className="cart__row">
                    <Link
                      to={`/products/${encodeURIComponent(item.product || item.productId)}`}
                      className="cart__thumb"
                    >
                      <img src={item.image} alt={item.name} />
                    </Link>

                    <div className="cart__info">
                      <Link
                        to={`/products/${encodeURIComponent(item.product || item.productId)}`}
                        className="cart__name"
                      >
                        {item.name}
                      </Link>
                      <p className="cart__meta">Size {item.size}</p>
                      <p className="cart__unit">{formatPrice(item.price)}</p>

                      <div className="cart__qty">
                        <button
                          type="button"
                          disabled={busy || item.quantity <= 1}
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart__remove"
                        disabled={busy}
                        onClick={() => removeItem(itemId)}
                      >
                        Remove
                      </button>
                    </div>

                    <p className="cart__line">{formatPrice(lineTotal)}</p>
                  </li>
                );
              })}
            </ul>

            <aside className="cart__summary">
              <h2>Order Summary</h2>
              <div className="cart__summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <p className="cart__note">결제 페이지에서 배송지와 결제 수단을 입력합니다.</p>
              <button
                type="button"
                className="cart__btn cart__btn--buy"
                onClick={() => navigate("/order")}
              >
                CHECKOUT
              </button>
              <Link to="/#new-arrivals" className="cart__keep">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
