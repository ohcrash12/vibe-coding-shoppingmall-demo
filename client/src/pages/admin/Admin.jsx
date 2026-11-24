import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../../api";
import BackLink from "../../components/BackLink";
import AdminShell, { MENU } from "./AdminShell";
import "./Admin.css";

const KPIS = [
  {
    label: "총 매출",
    value: "₩5,756,500",
    note: "오늘 +₩321,600",
    noteType: "up",
  },
  {
    label: "주문",
    value: "16",
    note: "결제대기 3건",
    noteType: "warn",
  },
  {
    label: "판매중 상품",
    value: "12",
    note: "품절대기 0",
    noteType: "muted",
  },
  {
    label: "재고 부족",
    value: "4",
    note: "품절 1 포함",
    noteType: "danger",
  },
  {
    label: "뉴스레터 구독",
    value: "6",
    note: "이번 주 +2",
    noteType: "up",
  },
];

const DAILY_SALES = [
  { label: "11/14", value: 88.7, amount: "88.7만" },
  { label: "11/15", value: 72.1, amount: "72.1만" },
  { label: "11/16", value: 95.4, amount: "95.4만" },
  { label: "11/17", value: 61.8, amount: "61.8만" },
  { label: "11/18", value: 84.2, amount: "84.2만" },
  { label: "11/19", value: 110.5, amount: "110.5만" },
  { label: "오늘", value: 32.16, amount: "32.2만", highlight: true },
];

const CATEGORY_SALES = [
  { label: "아우터", amount: "₩4,451,000", percent: 77 },
  { label: "액세서리", amount: "₩309,600", percent: 5 },
  { label: "데님", amount: "₩995,900", percent: 17 },
];

const RECENT_ORDERS = [
  {
    id: "SF-241120-01",
    date: "2026.11.20 10:24",
    customer: "김서연",
    product: "Toray N3B Goose Down Parka",
    price: "₩389,000",
    status: "결제완료",
    statusType: "paid",
  },
  {
    id: "SF-241120-02",
    date: "2026.11.20 09:51",
    customer: "박준호",
    product: "Wool A-1 Jacket",
    price: "₩248,000",
    status: "배송준비",
    statusType: "prep",
  },
  {
    id: "SF-241119-18",
    date: "2026.11.19 21:08",
    customer: "이하늘",
    product: "Storm Cargo Pants",
    price: "₩148,000",
    status: "결제완료",
    statusType: "paid",
  },
  {
    id: "SF-241119-17",
    date: "2026.11.19 18:42",
    customer: "최민지",
    product: "Ridge Wool Beanie",
    price: "₩45,000",
    status: "배송준비",
    statusType: "prep",
  },
];

const STOCK_ALERTS = [
  {
    name: "Frost Shell Gloves",
    status: "품절",
    statusType: "soldout",
    image:
      "https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?auto=format&fit=crop&w=120&q=80",
  },
  {
    name: "Summit Daypack",
    status: "2개 남음",
    statusType: "low",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=120&q=80",
  },
  {
    name: "Nordic Fleece Vest",
    status: "3개 남음",
    statusType: "low",
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=120&q=80",
  },
  {
    name: "Field Utility Bag",
    status: "1개 남음",
    statusType: "low",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a67478a?auto=format&fit=crop&w=120&q=80",
  },
];

const ORDER_STATUS_LABEL = {
  pending: "접수",
  paid: "결제완료",
  shipping: "배송중",
  delivered: "배송완료",
  cancelled: "취소",
};

const ORDER_STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "pending", label: ORDER_STATUS_LABEL.pending },
  { key: "paid", label: ORDER_STATUS_LABEL.paid },
  { key: "shipping", label: ORDER_STATUS_LABEL.shipping },
  { key: "delivered", label: ORDER_STATUS_LABEL.delivered },
  { key: "cancelled", label: ORDER_STATUS_LABEL.cancelled },
];

const PAYMENT_LABEL = {
  card: "카드",
  bank: "무통장",
  kakao: "카카오페이",
};

function formatOrderPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "-");
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatOrderDate(value) {
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

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(location.state?.menu || "dashboard");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 2,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusTab, setOrderStatusTab] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  useEffect(() => {
    if (location.state?.menu) {
      setActiveMenu(location.state.menu);
    }
  }, [location.state]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await fetch(apiUrl("/users/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }

        if (data.user?.user_type !== "admin") {
          navigate("/", { replace: true });
          return;
        }

        setUser(data.user);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (activeMenu !== "products") return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await fetch(apiUrl(`/products?page=${page}&limit=2`));
        const data = await response.json().catch(() => ({}));

        if (Array.isArray(data)) {
          setProducts(data);
          setPagination({
            page: 1,
            limit: 2,
            total: data.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          });
        } else {
          setProducts(Array.isArray(data.products) ? data.products : []);
          setPagination(
            data.pagination || {
              page: 1,
              limit: 2,
              total: 0,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            }
          );
        }
        setSelectedIds([]);
      } catch {
        setProducts([]);
        setSelectedIds([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [activeMenu, location.key, page]);

  useEffect(() => {
    if (activeMenu !== "orders") return;

    const token = sessionStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const response = await fetch(apiUrl("/orders"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setOrders([]);
          setOrdersError(data.message || "주문 목록을 불러오지 못했습니다.");
          return;
        }

        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (err) {
        if (err.name === "AbortError") return;
        setOrders([]);
        setOrdersError("주문 목록을 불러오지 못했습니다.");
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
    return () => controller.abort();
  }, [activeMenu, location.key]);

  const handleOrderStatusChange = async (orderId, nextStatus) => {
    if (!orderId || !nextStatus || updatingOrderId) return;

    const token = sessionStorage.getItem("token");
    if (!token) return;

    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(apiUrl(`/orders/${encodeURIComponent(orderId)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "주문 상태 변경에 실패했습니다.");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId || order.orderNumber === orderId
            ? { ...order, ...(data.order || {}), status: nextStatus }
            : order
        )
      );
    } catch (error) {
      alert(error.message || "주문 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const toggleSelectProduct = (productKey) => {
    setSelectedIds((prev) =>
      prev.includes(productKey)
        ? prev.filter((id) => id !== productKey)
        : [...prev, productKey]
    );
  };

  const openDeleteConfirm = () => {
    if (selectedIds.length === 0 || deleting) return;
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setShowDeleteConfirm(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0 || deleting) return;

    setDeleting(true);

    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await fetch(apiUrl(`/products/${encodeURIComponent(id)}`), {
            method: "DELETE",
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || "상품 삭제에 실패했습니다.");
          }
          return id;
        })
      );

      setSelectedIds([]);
      setShowDeleteConfirm(false);

      // 삭제 후 현재 페이지 다시 조회 (비면 이전 페이지로)
      const response = await fetch(apiUrl(`/products?page=${page}&limit=2`));
      const data = await response.json().catch(() => ({}));
      const nextProducts = Array.isArray(data.products) ? data.products : [];
      const nextPagination = data.pagination || pagination;

      if (nextProducts.length === 0 && nextPagination.hasPrev) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        setProducts(nextProducts);
        setPagination(nextPagination);
      }
    } catch (error) {
      alert(error.message || "상품 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin admin--loading">
        <p>권한 확인 중...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const maxDaily = Math.max(...DAILY_SALES.map((d) => d.value));
  const filteredProducts = products.filter((product) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      product.name?.toLowerCase().includes(q) ||
      product.productId?.toLowerCase().includes(q) ||
      product.category?.toLowerCase().includes(q)
    );
  });

  const orderTabCounts = ORDER_STATUS_TABS.reduce((acc, tab) => {
    if (tab.key === "all") {
      acc[tab.key] = orders.length;
    } else {
      acc[tab.key] = orders.filter(
        (order) => (order.status || "pending") === tab.key
      ).length;
    }
    return acc;
  }, {});

  const filteredOrders = orders.filter((order) => {
    const statusKey = order.status || "pending";
    if (orderStatusTab !== "all" && statusKey !== orderStatusTab) return false;

    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;

    const firstItem = order.items?.[0];
    const customerName = order.user?.name || order.shipping?.receiver || "";
    const customerEmail = order.user?.email || "";

    return (
      order.orderNumber?.toLowerCase().includes(q) ||
      customerName.toLowerCase().includes(q) ||
      customerEmail.toLowerCase().includes(q) ||
      firstItem?.name?.toLowerCase().includes(q) ||
      order.shipping?.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell user={user} activeMenu={activeMenu} onMenuChange={setActiveMenu}>
      <BackLink to="/" label="Back to shop" className="back-link-wrap--flush" />
      {activeMenu === "dashboard" ? (
        <>
          <header className="admin__header">
            <div>
              <h1>DASHBOARD</h1>
              <p>2026.11.20 · 최근 7일</p>
            </div>
          </header>

          <section className="admin__kpi-grid">
            {KPIS.map((kpi) => (
              <article key={kpi.label} className="admin__kpi">
                <p className="admin__kpi-label">{kpi.label}</p>
                <p className="admin__kpi-value">{kpi.value}</p>
                <p className={`admin__kpi-note is-${kpi.noteType}`}>{kpi.note}</p>
              </article>
            ))}
          </section>

          <section className="admin__charts">
            <article className="admin__panel">
              <h2>일별 매출</h2>
              <div className="admin__bars" role="img" aria-label="일별 매출 차트">
                {DAILY_SALES.map((day) => (
                  <div key={day.label} className="admin__bar-col">
                    <span className="admin__bar-amount">{day.amount}</span>
                    <div
                      className={`admin__bar${day.highlight ? " is-today" : ""}`}
                      style={{ height: `${(day.value / maxDaily) * 100}%` }}
                    />
                    <span className="admin__bar-label">{day.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin__panel">
              <h2>카테고리별 매출</h2>
              <ul className="admin__category-list">
                {CATEGORY_SALES.map((cat) => (
                  <li key={cat.label}>
                    <div className="admin__category-top">
                      <span>{cat.label}</span>
                      <strong>{cat.amount}</strong>
                    </div>
                    <div className="admin__category-track">
                      <span style={{ width: `${cat.percent}%` }} />
                    </div>
                    <p className="admin__category-percent">{cat.percent}%</p>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="admin__bottom">
            <article className="admin__panel">
              <h2>최근 주문</h2>
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>주문</th>
                      <th>고객</th>
                      <th>상품</th>
                      <th>금액</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_ORDERS.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <p className="admin__order-id">{order.id}</p>
                          <p className="admin__order-date">{order.date}</p>
                        </td>
                        <td>{order.customer}</td>
                        <td>{order.product}</td>
                        <td>{order.price}</td>
                        <td>
                          <span className={`admin__status is-${order.statusType}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="admin__panel">
              <h2>재고 알림</h2>
              <ul className="admin__stock-list">
                {STOCK_ALERTS.map((item) => (
                  <li key={item.name}>
                    <img src={item.image} alt="" loading="lazy" />
                    <div>
                      <p className="admin__stock-name">{item.name}</p>
                      <span className={`admin__status is-${item.statusType}`}>
                        {item.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : activeMenu === "products" ? (
        <>
          <header className="admin__header">
            <div>
              <h1>PRODUCTS</h1>
              <p>등록된 상품을 관리합니다</p>
            </div>
            <div className="admin-products__actions">
              <Link to="/admin/products/new" className="admin__primary-btn">
                + 상품 추가
              </Link>
              <button
                type="button"
                className="admin__danger-btn"
                disabled={selectedIds.length === 0 || deleting}
                onClick={openDeleteConfirm}
              >
                삭제
              </button>
            </div>
          </header>

          {showDeleteConfirm ? (
            <div className="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
              <button
                type="button"
                className="admin-confirm__backdrop"
                aria-label="닫기"
                onClick={closeDeleteConfirm}
              />
              <div className="admin-confirm__card">
                <h2 id="delete-confirm-title">상품 삭제</h2>
                <p>선택한 상품 {selectedIds.length}개를 삭제할까요?</p>
                <div className="admin-confirm__actions">
                  <button
                    type="button"
                    className="admin__ghost-btn"
                    onClick={closeDeleteConfirm}
                    disabled={deleting}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="admin__danger-btn"
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                  >
                    {deleting ? "삭제 중..." : "확인"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <section className="admin__panel admin-products">
            <div className="admin-products__toolbar">
              <input
                type="search"
                placeholder="상품명, ID, 카테고리 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {productsLoading ? (
              <p className="admin-products__empty">상품을 불러오는 중...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="admin-products__empty">등록된 상품이 없습니다. 상품을 추가해 보세요.</p>
            ) : (
              <>
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>상품 정보</th>
                      <th>상품 ID</th>
                      <th>카테고리</th>
                      <th>가격</th>
                      <th>사이즈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const imageSrc =
                        (Array.isArray(product.images) && product.images[0]) ||
                        product.image ||
                        product.imageUrl ||
                        "";
                      const detailId = product.productId || product._id;
                      const selectKey = product._id || product.productId;
                      const checked = selectedIds.includes(selectKey);
                      const sizes = Array.isArray(product.size)
                        ? product.size
                        : product.size
                          ? [product.size]
                          : [];

                      return (
                        <tr key={selectKey} className={checked ? "is-selected" : ""}>
                          <td>
                            <div className="admin-products__info">
                              <input
                                type="checkbox"
                                className="admin-products__checkbox"
                                checked={checked}
                                onChange={() => toggleSelectProduct(selectKey)}
                                aria-label={`${product.name} 선택`}
                              />
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={product.name || "상품 이미지"}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="admin-products__thumb-empty" aria-hidden="true" />
                              )}
                              <Link
                                to={`/admin/products/${encodeURIComponent(detailId)}`}
                                className="admin-products__name-link"
                              >
                                {product.name}
                              </Link>
                            </div>
                          </td>
                          <td>
                            <span className="admin-products__id">{detailId}</span>
                          </td>
                          <td>{product.category}</td>
                          <td>₩{Number(product.price).toLocaleString("ko-KR")}</td>
                          <td>
                            {sizes.length > 0 ? (
                              <div className="admin-products__sizes">
                                {sizes.map((size) => (
                                  <span key={size} className="admin-products__size-chip">
                                    {size}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="admin-products__empty-cell">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-products__pagination">
                <button
                  type="button"
                  className="admin__ghost-btn"
                  disabled={!pagination.hasPrev || productsLoading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  이전
                </button>
                <p>
                  {pagination.page} / {pagination.totalPages}
                  <span> (총 {pagination.total}개)</span>
                </p>
                <button
                  type="button"
                  className="admin__ghost-btn"
                  disabled={!pagination.hasNext || productsLoading}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  다음
                </button>
              </div>
              </>
            )}
          </section>
        </>
      ) : activeMenu === "orders" ? (
        <>
          <header className="admin__header">
            <div>
              <h1>ORDERS</h1>
              <p>전체 주문을 확인하고 상태를 관리합니다</p>
            </div>
            <p className="admin-orders__count">
              {ordersLoading ? "불러오는 중…" : `총 ${orders.length}건`}
            </p>
          </header>

          <section className="admin__panel admin-orders">
            <div className="admin-orders__tabs" role="tablist" aria-label="주문 상태">
              {ORDER_STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={orderStatusTab === tab.key}
                  className={`admin-orders__tab${orderStatusTab === tab.key ? " is-active" : ""}`}
                  onClick={() => setOrderStatusTab(tab.key)}
                >
                  {tab.label}
                  <span className="admin-orders__tab-count">
                    {orderTabCounts[tab.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="admin-products__toolbar">
              <input
                type="search"
                placeholder="주문번호, 고객명, 상품명, 연락처 검색"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>

            {ordersLoading ? (
              <p className="admin-products__empty">주문을 불러오는 중...</p>
            ) : ordersError ? (
              <p className="admin-products__empty">{ordersError}</p>
            ) : filteredOrders.length === 0 ? (
              <p className="admin-products__empty">
                {orders.length === 0
                  ? "아직 주문이 없습니다."
                  : "조건에 맞는 주문이 없습니다."}
              </p>
            ) : (
              <div className="admin__table-wrap">
                <table className="admin__table admin-orders__table">
                  <thead>
                    <tr>
                      <th>주문</th>
                      <th>고객</th>
                      <th>상품</th>
                      <th>결제</th>
                      <th>금액</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const firstItem = order.items?.[0];
                      const extraCount = Math.max(0, (order.items?.length || 0) - 1);
                      const statusKey = order.status || "pending";
                      const customerName =
                        order.user?.name || order.shipping?.receiver || "-";
                      const customerEmail = order.user?.email || "";
                      const orderKey = order._id || order.orderNumber;
                      const imageSrc = firstItem?.image || "";

                      return (
                        <tr key={orderKey}>
                          <td>
                            <p className="admin__order-id">{order.orderNumber}</p>
                            <p className="admin__order-date">
                              {formatOrderDate(order.createdAt)}
                            </p>
                          </td>
                          <td>
                            <p className="admin-orders__customer">{customerName}</p>
                            {customerEmail ? (
                              <p className="admin__order-date">{customerEmail}</p>
                            ) : null}
                            {order.shipping?.phone ? (
                              <p className="admin__order-date">{order.shipping.phone}</p>
                            ) : null}
                          </td>
                          <td>
                            <div className="admin-orders__product">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={firstItem?.name || "상품"}
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  className="admin-products__thumb-empty"
                                  aria-hidden="true"
                                />
                              )}
                              <div>
                                <p className="admin-orders__product-name">
                                  {firstItem?.name || "상품"}
                                  {extraCount > 0 ? ` 외 ${extraCount}건` : ""}
                                </p>
                                <p className="admin__order-date">
                                  {order.items?.length || 0} item
                                  {(order.items?.length || 0) === 1 ? "" : "s"}
                                  {firstItem?.size ? ` · Size ${firstItem.size}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            {PAYMENT_LABEL[order.paymentMethod] ||
                              order.paymentMethod ||
                              "-"}
                          </td>
                          <td>{formatOrderPrice(order.totalPrice)}</td>
                          <td>
                            <div className="admin-orders__status-cell">
                              <span className={`admin__status is-${statusKey}`}>
                                {ORDER_STATUS_LABEL[statusKey] || statusKey}
                              </span>
                              <select
                                className="admin-orders__status-select"
                                value={statusKey}
                                disabled={updatingOrderId === orderKey}
                                onChange={(e) =>
                                  handleOrderStatusChange(orderKey, e.target.value)
                                }
                                aria-label={`${order.orderNumber} 상태 변경`}
                              >
                                {Object.entries(ORDER_STATUS_LABEL).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="admin__placeholder">
          <h1>{MENU.find((item) => item.id === activeMenu)?.label}</h1>
          <p>이 메뉴 화면은 다음 단계에서 연결할 수 있습니다.</p>
        </section>
      )}
    </AdminShell>
  );
}

export default Admin;
