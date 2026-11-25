import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../../api";

const MENU = [
  { id: "dashboard", label: "Dashboard", icon: "▦", to: "/admin" },
  { id: "products", label: "상품 관리", icon: "▣", to: "/admin" },
  { id: "orders", label: "주문 관리", icon: "▤", to: "/admin" },
  {
    id: "subscribers",
    label: "회원 관리",
    icon: "✉",
    to: "/admin/subscribers",
  },
  { id: "settings", label: "스토어 설정", icon: "⚙", to: "/admin" },
];

function countNewOrders(orders) {
  return (Array.isArray(orders) ? orders : []).filter((order) => {
    const status = order.status || "pending";
    return status === "pending" || status === "paid";
  }).length;
}

function AdminShell({
  user,
  activeMenu,
  onMenuChange,
  children,
  // Admin에서 주문 목록 기준 카운트 (있으면 우선 사용)
  newOrderCount,
}) {
  const navigate = useNavigate();
  const [fetchedNewOrderCount, setFetchedNewOrderCount] = useState(0);

  const handleMenuClick = (item) => {
    if (item.to && item.to !== "/admin") {
      navigate(item.to);
      return;
    }
    onMenuChange?.(item.id);
  };

  useEffect(() => {
    // 부모가 카운트를 관리하면 여기서는 조회하지 않음
    if (typeof newOrderCount === "number") return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      setFetchedNewOrderCount(0);
      return;
    }

    const controller = new AbortController();

    const fetchNewOrders = async () => {
      try {
        const response = await fetch(apiUrl("/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFetchedNewOrderCount(0);
          return;
        }
        setFetchedNewOrderCount(countNewOrders(data.orders));
      } catch (err) {
        if (err.name === "AbortError") return;
        setFetchedNewOrderCount(0);
      }
    };

    fetchNewOrders();
    return () => controller.abort();
  }, [newOrderCount, user]);

  const badgeCount =
    typeof newOrderCount === "number" ? newOrderCount : fetchedNewOrderCount;

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <div className="admin__brand">
          <p className="admin__brand-title">STANDFAST</p>
          <p className="admin__brand-sub">ADMIN CONSOLE</p>
        </div>

        <nav className="admin__menu" aria-label="Admin menu">
          {MENU.map((item) => {
            const showBadge = item.id === "orders" && badgeCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin__menu-item${activeMenu === item.id ? " is-active" : ""}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="admin__menu-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {showBadge ? (
                  <span className="admin__menu-badge" aria-label={`새 주문 ${badgeCount}건`}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="admin__sidebar-foot">
          {user?.name ? <p className="admin__sidebar-user">{user.name}님</p> : null}
          <Link to="/" className="admin__store-link">
            ← 스토어로 돌아가기
          </Link>
        </div>
      </aside>

      <div className="admin__content">{children}</div>
    </div>
  );
}

export default AdminShell;
export { MENU, countNewOrders };
