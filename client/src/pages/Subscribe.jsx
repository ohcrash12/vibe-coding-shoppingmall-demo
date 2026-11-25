import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";
import "./Subscribe.css";

const PORTONE_IMP_CODE = "imp13802742";
const SUBSCRIBE_PRICE = 10000;
const SUBSCRIBE_NAME = "STANDFAST 월간 구독";

const BENEFITS = [
  {
    title: "월 3회 무료 교환·반품",
    copy: "구독 기간 동안 교환·반품 배송비를 월 3회까지 지원합니다.",
  },
  {
    title: "주 1회 추천 코디·상품",
    copy: "매주 시즌에 맞는 코디와 추천 상품을 메신저로 받아보세요.",
  },
  {
    title: "1만원 쿠폰 박스",
    copy: "5,000원 · 3,000원 · 2,000원 쿠폰 3장을 구매 시 사용할 수 있습니다.",
  },
];

function formatPrice(price) {
  return `₩${Number(price).toLocaleString("ko-KR")}`;
}

function Subscribe() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const { IMP } = window;
    if (IMP) IMP.init(PORTONE_IMP_CODE);
  }, []);

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
        setError("");
      } catch (err) {
        if (err.name === "AbortError") return;
        setError("회원 정보를 불러오지 못했습니다.");
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
    refreshCartCount();
  };

  const handleSubscribePay = () => {
    setFormError("");

    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("LOGIN_REQUIRED");
      return;
    }

    const { IMP } = window;
    if (!IMP) {
      setFormError("결제 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      return;
    }

    setSubmitting(true);
    const merchantUid = `SF_SUB_${Date.now()}`;

    IMP.request_pay(
      {
        pg: "html5_inicis",
        pay_method: "card",
        merchant_uid: merchantUid,
        name: SUBSCRIBE_NAME,
        amount: SUBSCRIBE_PRICE,
        buyer_email: user?.email || "",
        buyer_name: user?.name || "",
        buyer_tel: "",
      },
      (rsp) => {
        if (!rsp.success) {
          setSubmitting(false);
          navigate("/subscribe/fail", {
            replace: true,
            state: {
              message: rsp.error_msg || "결제가 취소되었거나 실패했습니다.",
              merchantUid: rsp.merchant_uid || merchantUid,
            },
          });
          return;
        }

        fetch(apiUrl("/users/me/subscribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            impUid: rsp.imp_uid,
            merchantUid: rsp.merchant_uid,
            days: 30,
          }),
        })
          .then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.message || "구독 활성화에 실패했습니다.");
            }

            if (data.token) {
              sessionStorage.setItem("token", data.token);
            }
            if (data.user) {
              sessionStorage.setItem("user", JSON.stringify(data.user));
              setUser(data.user);
            }

            const expiresAt =
              data.subscription?.expiresAt ||
              data.user?.subscriptionExpiresAt ||
              null;

            navigate("/subscribe/complete", {
              replace: true,
              state: {
                price: SUBSCRIBE_PRICE,
                expiresAt,
                merchantUid: rsp.merchant_uid,
              },
            });
          })
          .catch((err) => {
            setFormError(err.message || "구독 활성화에 실패했습니다.");
          })
          .finally(() => {
            setSubmitting(false);
          });
      }
    );
  };

  return (
    <div className="home cart-page order-page subscribe-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/" label="Back" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Subscribe</h1>
          <p className="cart__sub">
            월 {formatPrice(SUBSCRIBE_PRICE)}으로 한 달 구독 혜택을 받아보세요.
          </p>
        </header>

        {error === "LOGIN_REQUIRED" ? (
          <div className="cart__empty">
            <p>구독 결제를 진행하려면 로그인이 필요합니다.</p>
            <Link to="/login" className="cart__btn cart__btn--dark">
              LOGIN
            </Link>
            <Link to="/register" className="cart__keep">
              회원가입
            </Link>
          </div>
        ) : loading ? (
          <p className="cart__status">구독 정보를 불러오는 중…</p>
        ) : error ? (
          <p className="cart__status">{error}</p>
        ) : (
          <div className="cart__layout subscribe__layout">
            <div className="order__main">
              <section className="order__panel">
                <h2 className="order__panel-title">구독 혜택</h2>
                <ul className="subscribe__benefits">
                  {BENEFITS.map((item) => (
                    <li key={item.title}>
                      <p className="subscribe__benefit-title">{item.title}</p>
                      <p className="subscribe__benefit-copy">{item.copy}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="order__panel">
                <h2 className="order__panel-title">요금제</h2>
                <div className="subscribe__plan">
                  <div>
                    <p className="subscribe__plan-name">월간 멤버십</p>
                    <p className="subscribe__plan-note">
                      결제 후 30일간 이용 · 자동 갱신 없음(단건 결제)
                    </p>
                  </div>
                  <p className="subscribe__plan-price">{formatPrice(SUBSCRIBE_PRICE)}</p>
                </div>
              </section>
            </div>

            <aside className="cart__summary">
              <h2>Payment</h2>
              <div className="cart__summary-row">
                <span>구독 상품</span>
                <strong>월간 멤버십</strong>
              </div>
              <div className="cart__summary-row">
                <span>이용 기간</span>
                <strong>30일</strong>
              </div>
              <div className="cart__summary-row order__total-row">
                <span>Total</span>
                <strong>{formatPrice(SUBSCRIBE_PRICE)}</strong>
              </div>
              <p className="cart__note">카드 결제로 바로 구독을 시작할 수 있습니다.</p>

              {formError ? <p className="order__form-error">{formError}</p> : null}

              <button
                type="button"
                className="cart__btn cart__btn--buy"
                disabled={submitting}
                onClick={handleSubscribePay}
              >
                {submitting ? "PAYMENT…" : "월 10,000원 구독하기"}
              </button>
              <Link to="/" className="cart__keep">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscribe;
