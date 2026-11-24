import { Link } from "react-router-dom";

const MENU = [
  { id: "dashboard", label: "Dashboard", icon: "▦", to: "/admin" },
  { id: "products", label: "상품 관리", icon: "▣", to: "/admin" },
  { id: "orders", label: "주문 관리", icon: "▤", to: "/admin" },
  { id: "subscribers", label: "구독자", icon: "✉", to: "/admin" },
  { id: "settings", label: "스토어 설정", icon: "⚙", to: "/admin" },
];

function AdminShell({ user, activeMenu, onMenuChange, children }) {
  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <div className="admin__brand">
          <p className="admin__brand-title">STANDFAST</p>
          <p className="admin__brand-sub">ADMIN CONSOLE</p>
        </div>

        <nav className="admin__menu" aria-label="Admin menu">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin__menu-item${activeMenu === item.id ? " is-active" : ""}`}
              onClick={() => onMenuChange?.(item.id)}
            >
              <span className="admin__menu-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge ? <span className="admin__menu-badge">{item.badge}</span> : null}
            </button>
          ))}
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
export { MENU };
