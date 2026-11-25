import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../api";
import BackLink from "../../components/BackLink";
import AdminShell from "./AdminShell";
import "./Admin.css";

const MEMBER_TABS = [
  { key: "customers", label: "회원" },
  { key: "subscribers", label: "구독자" },
];

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return "₩0";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR");
}

function AdminSubscribers() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberTab, setMemberTab] = useState("customers");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [customerSummary, setCustomerSummary] = useState({
    customerCount: 0,
    purchasedCount: 0,
    totalOrderCount: 0,
    totalOrderSales: 0,
  });
  const [subscriberSummary, setSubscriberSummary] = useState({
    subscriberCount: 0,
    activeCount: 0,
    totalSubscriptionCount: 0,
    totalOrderSales: 0,
    totalSubscriptionRevenue: 0,
    totalSales: 0,
  });

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await fetch(apiUrl("/users/me"), {
          headers: { Authorization: `Bearer ${token}` },
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
    if (!user) return;

    const token = sessionStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    const fetchMembers = async () => {
      setListLoading(true);
      setError("");
      try {
        const [customersRes, subscribersRes] = await Promise.all([
          fetch(apiUrl("/users/customers"), {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
          fetch(apiUrl("/users/subscribers"), {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        ]);

        const customersData = await customersRes.json().catch(() => ({}));
        const subscribersData = await subscribersRes.json().catch(() => ({}));

        if (!customersRes.ok) {
          throw new Error(
            customersData.message || "회원 목록을 불러오지 못했습니다."
          );
        }
        if (!subscribersRes.ok) {
          throw new Error(
            subscribersData.message || "구독자 목록을 불러오지 못했습니다."
          );
        }

        setCustomers(
          Array.isArray(customersData.customers) ? customersData.customers : []
        );
        setCustomerSummary(
          customersData.summary || {
            customerCount: 0,
            purchasedCount: 0,
            totalOrderCount: 0,
            totalOrderSales: 0,
          }
        );
        setSubscribers(
          Array.isArray(subscribersData.subscribers)
            ? subscribersData.subscribers
            : []
        );
        setSubscriberSummary(
          subscribersData.summary || {
            subscriberCount: 0,
            activeCount: 0,
            totalSubscriptionCount: 0,
            totalOrderSales: 0,
            totalSubscriptionRevenue: 0,
            totalSales: 0,
          }
        );
      } catch (err) {
        if (err.name === "AbortError") return;
        setCustomers([]);
        setSubscribers([]);
        setError(err.message || "회원 목록을 불러오지 못했습니다.");
      } finally {
        setListLoading(false);
      }
    };

    fetchMembers();
    return () => controller.abort();
  }, [user]);

  const tabCounts = useMemo(
    () => ({
      customers: customers.length,
      subscribers: subscribers.length,
    }),
    [customers.length, subscribers.length]
  );

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((row) => {
      const haystack = [row.name, row.email, row.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, search]);

  const filteredSubscribers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((row) => {
      const haystack = [row.name, row.email, row.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [subscribers, search]);

  if (loading) {
    return (
      <div className="admin admin--loading">
        <p>관리자 권한 확인 중...</p>
      </div>
    );
  }

  const isCustomersTab = memberTab === "customers";
  const activeList = isCustomersTab ? filteredCustomers : filteredSubscribers;
  const totalForTab = isCustomersTab ? customers.length : subscribers.length;

  return (
    <AdminShell
      user={user}
      activeMenu="subscribers"
      onMenuChange={(menuId) => {
        if (menuId === "subscribers") return;
        navigate("/admin", { state: { menu: menuId } });
      }}
    >
      <BackLink to="/admin" label="Back to admin" />

      <header className="admin__header">
        <div>
          <h1>회원 관리</h1>
          <p>일반 회원과 구독자 정보를 확인하고 매출을 관리합니다</p>
        </div>
        <p className="admin-orders__count">
          {listLoading
            ? "불러오는 중…"
            : `총 ${customers.length + subscribers.length}명`}
        </p>
      </header>

      {isCustomersTab ? (
        <section className="admin__kpi-grid admin-sub-manage__kpi admin-sub-manage__kpi--customers">
          <article className="admin__kpi">
            <p className="admin__kpi-label">회원 수</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : `${customerSummary.customerCount}명`}
            </p>
            <p className="admin__kpi-note is-muted">user_type = customer</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">구매 회원</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : `${customerSummary.purchasedCount}명`}
            </p>
            <p className="admin__kpi-note is-muted">1회 이상 결제</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">총 주문</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : `${customerSummary.totalOrderCount}건`}
            </p>
            <p className="admin__kpi-note is-muted">결제·배송·완료</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">상품 매출</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : formatPrice(customerSummary.totalOrderSales)}
            </p>
            <p className="admin__kpi-note is-up">일반 회원 주문 합계</p>
          </article>
        </section>
      ) : (
        <section className="admin__kpi-grid admin-sub-manage__kpi">
          <article className="admin__kpi">
            <p className="admin__kpi-label">구독자 수</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : `${subscriberSummary.subscriberCount}명`}
            </p>
            <p className="admin__kpi-note is-muted">
              구독중 {subscriberSummary.activeCount}명
            </p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">총 구독</p>
            <p className="admin__kpi-value">
              {listLoading
                ? "…"
                : `${subscriberSummary.totalSubscriptionCount}회`}
            </p>
            <p className="admin__kpi-note is-muted">누적 구독 결제</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">구독 매출</p>
            <p className="admin__kpi-value">
              {listLoading
                ? "…"
                : formatPrice(subscriberSummary.totalSubscriptionRevenue)}
            </p>
            <p className="admin__kpi-note is-up">월 ₩10,000 × 구독 횟수</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">상품 매출</p>
            <p className="admin__kpi-value">
              {listLoading
                ? "…"
                : formatPrice(subscriberSummary.totalOrderSales)}
            </p>
            <p className="admin__kpi-note is-muted">결제·배송·완료 주문</p>
          </article>
          <article className="admin__kpi">
            <p className="admin__kpi-label">총 매출</p>
            <p className="admin__kpi-value">
              {listLoading ? "…" : formatPrice(subscriberSummary.totalSales)}
            </p>
            <p className="admin__kpi-note is-up">구독 + 상품</p>
          </article>
        </section>
      )}

      <section className="admin__panel admin-orders">
        <div className="admin-orders__tabs" role="tablist" aria-label="회원 유형">
          {MEMBER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={memberTab === tab.key}
              className={`admin-orders__tab${
                memberTab === tab.key ? " is-active" : ""
              }`}
              onClick={() => setMemberTab(tab.key)}
            >
              {tab.label}
              <span className="admin-orders__tab-count">
                {tabCounts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="admin-products__toolbar">
          <input
            type="search"
            placeholder="이름, 이메일, 주소 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {listLoading ? (
          <p className="admin-products__empty">회원 목록을 불러오는 중...</p>
        ) : error ? (
          <p className="admin-products__empty">{error}</p>
        ) : activeList.length === 0 ? (
          <p className="admin-products__empty">
            {totalForTab === 0
              ? isCustomersTab
                ? "등록된 일반 회원이 없습니다."
                : "등록된 구독자가 없습니다."
              : "조건에 맞는 회원이 없습니다."}
          </p>
        ) : isCustomersTab ? (
          <div className="admin__table-wrap">
            <table className="admin__table admin-sub-manage__table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>이메일</th>
                  <th>유형</th>
                  <th>주문</th>
                  <th>상품 매출</th>
                  <th>주소</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.name || "-"}</strong>
                    </td>
                    <td>{row.email || "-"}</td>
                    <td>
                      <span className="admin-sub-manage__status">일반 회원</span>
                    </td>
                    <td>{row.orderCount || 0}건</td>
                    <td>
                      <strong>{formatPrice(row.orderSales)}</strong>
                    </td>
                    <td>{row.address || "-"}</td>
                    <td>{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin__table-wrap">
            <table className="admin__table admin-sub-manage__table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>이메일</th>
                  <th>상태</th>
                  <th>총 구독</th>
                  <th>구독 매출</th>
                  <th>상품 매출</th>
                  <th>총 매출</th>
                  <th>결제일</th>
                  <th>만료일</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((row) => (
                  <tr key={row._id}>
                    <td>
                      <strong>{row.name || "-"}</strong>
                      {row.address ? (
                        <p className="admin-sub-manage__sub">{row.address}</p>
                      ) : null}
                    </td>
                    <td>{row.email || "-"}</td>
                    <td>
                      <span
                        className={`admin-sub-manage__status${
                          row.isActive ? " is-active" : ""
                        }`}
                      >
                        {row.isActive ? "구독중" : "만료/종료"}
                      </span>
                    </td>
                    <td>총 {row.subscriptionCount || 0}번 구독</td>
                    <td>{formatPrice(row.subscriptionRevenue)}</td>
                    <td>
                      {formatPrice(row.orderSales)}
                      <p className="admin-sub-manage__sub">
                        주문 {row.orderCount || 0}건
                      </p>
                    </td>
                    <td>
                      <strong>{formatPrice(row.totalSales)}</strong>
                    </td>
                    <td>{formatDate(row.subscriptionPaidAt)}</td>
                    <td>{formatDate(row.subscriptionExpiresAt)}</td>
                    <td>{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

export default AdminSubscribers;
