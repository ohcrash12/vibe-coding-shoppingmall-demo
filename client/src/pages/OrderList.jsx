import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";

const STATUS_LABEL = {
  pending: "접수",
  paid: "결제완료",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "pending", label: STATUS_LABEL.pending },
  { key: "paid", label: STATUS_LABEL.paid },
  { key: "shipping", label: STATUS_LABEL.shipping },
  { key: "delivered", label: STATUS_LABEL.delivered },
  { key: "cancelled", label: STATUS_LABEL.cancelled },
];

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "");
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrderList() {
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statusTab, setStatusTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredOrders =
    statusTab === "all"
      ? orders
      : orders.filter((order) => (order.status || "pending") === statusTab);

  const tabCounts = STATUS_TABS.reduce((acc, tab) => {
    if (tab.key === "all") {
      acc[tab.key] = orders.length;
    } else {
      acc[tab.key] = orders.filter(
        (order) => (order.status || "pending") === tab.key
      ).length;
    }
    return acc;
  }, {});

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
          setLoading(false);
          return;
        }

        setUser(meData.user);

        const ordersRes = await fetch(apiUrl("/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const ordersData = await ordersRes.json().catch(() => ({}));

        if (!ordersRes.ok) {
          setError(ordersData.message || "주문 내역을 불러오지 못했습니다.");
          setLoading(false);
          return;
        }

        setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError("주문 내역을 불러오지 못했습니다.");
      } finally {
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
    setOrders([]);
    refreshCartCount();
  };

  return (
    <div className="home cart-page order-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/" label="Back" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">My Orders</h1>
          <p className="cart__sub">
            {loading
              ? "불러오는 중…"
              : `${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {error === "LOGIN_REQUIRED" ? (
          <div className="cart__empty">
            <p>주문 내역을 보려면 로그인이 필요합니다.</p>
            <Link to="/login" className="cart__btn cart__btn--dark">
              LOGIN
            </Link>
          </div>
        ) : loading ? (
          <p className="cart__status">주문 내역을 불러오는 중…</p>
        ) : error ? (
          <p className="cart__status">{error}</p>
        ) : orders.length === 0 ? (
          <div className="cart__empty">
            <p>아직 주문 내역이 없습니다.</p>
            <Link to="/#new-arrivals" className="cart__btn cart__btn--dark">
              CONTINUE SHOPPING
            </Link>
          </div>
        ) : (
          <>
            <div className="orders__tabs" role="tablist" aria-label="주문 상태">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={statusTab === tab.key}
                  className={`orders__tab${statusTab === tab.key ? " is-active" : ""}`}
                  onClick={() => setStatusTab(tab.key)}
                >
                  {tab.label}
                  <span className="orders__tab-count">{tabCounts[tab.key] ?? 0}</span>
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="cart__empty">
                <p>해당 상태의 주문이 없습니다.</p>
              </div>
            ) : (
              <ul className="orders__list">
                {filteredOrders.map((order) => {
                  const firstItem = order.items?.[0];
                  const extraCount = Math.max(0, (order.items?.length || 0) - 1);
                  const statusKey = order.status || "pending";

                  return (
                    <li key={order._id || order.orderNumber} className="orders__card">
                      <div className="orders__card-top">
                        <div>
                          <p className="orders__no">{order.orderNumber}</p>
                          <p className="orders__date">{formatDate(order.createdAt)}</p>
                        </div>
                        <span className={`orders__status is-${statusKey}`}>
                          {STATUS_LABEL[statusKey] || statusKey}
                        </span>
                      </div>

                      <div className="orders__body">
                        {firstItem ? (
                          <div className="orders__thumb">
                            <img src={firstItem.image} alt={firstItem.name} />
                          </div>
                        ) : null}

                        <div className="orders__info">
                          <p className="orders__name">
                            {firstItem?.name || "상품"}
                            {extraCount > 0 ? ` 외 ${extraCount}건` : ""}
                          </p>
                          <p className="orders__meta">
                            {order.items?.length || 0} item
                            {(order.items?.length || 0) === 1 ? "" : "s"}
                            {firstItem?.size ? ` · Size ${firstItem.size}` : ""}
                          </p>
                          <p className="orders__ship">
                            {order.shipping?.receiver}
                            {order.shipping?.address
                              ? ` · ${order.shipping.address}`
                              : ""}
                          </p>
                        </div>

                        <p className="orders__total">{formatPrice(order.totalPrice)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OrderList;
