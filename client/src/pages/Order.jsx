import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Cart.css";
import "./Order.css";

const PAYMENT_OPTIONS = [
  { value: "card", label: "신용/체크카드" },
  { value: "bank", label: "무통장입금" },
  { value: "kakao", label: "카카오페이" },
];

// 포트원(아임포트) 고객사 식별코드
const PORTONE_IMP_CODE = "imp13802742";

function formatPrice(price) {
  const n = Number(price);
  if (Number.isNaN(n)) return String(price ?? "");
  return `₩${n.toLocaleString("ko-KR")}`;
}

// 결제수단 → 포트원 pg / pay_method
function getPortOnePayConfig(method) {
  if (method === "kakao") {
    return { pg: "kakaopay", pay_method: "card" };
  }
  if (method === "bank") {
    return { pg: "html5_inicis", pay_method: "vbank" };
  }
  return { pg: "html5_inicis", pay_method: "card" };
}

function buildOrderName(cartItems) {
  if (!cartItems.length) return "STANDFAST 주문";
  if (cartItems.length === 1) return cartItems[0].name;
  return `${cartItems[0].name} 외 ${cartItems.length - 1}건`;
}

function Order() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [shipping, setShipping] = useState({
    receiver: "",
    phone: "",
    address: "",
    detailAddress: "",
    zipCode: "",
  });

  // 포트원 결제 모듈 초기화
  useEffect(() => {
    const { IMP } = window;
    if (!IMP) {
      console.warn("포트원 결제 스크립트를 불러오지 못했습니다. index.html의 iamport.js를 확인하세요.");
      return;
    }

    IMP.init(PORTONE_IMP_CODE);
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
        setShipping((prev) => ({
          ...prev,
          receiver: meData.user?.name || "",
          address: meData.user?.address || "",
        }));

        const cartRes = await fetch(apiUrl("/carts"), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const cartData = await cartRes.json().catch(() => ({}));

        if (!cartRes.ok) {
          setError(cartData.message || "장바구니를 불러오지 못했습니다.");
          setLoading(false);
          return;
        }

        const nextItems = Array.isArray(cartData.cart?.items) ? cartData.cart.items : [];
        setItems(nextItems);
        setTotalPrice(Number(cartData.totalPrice) || 0);

        if (nextItems.length === 0) {
          setError("EMPTY_CART");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        setError("주문 정보를 불러오지 못했습니다.");
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

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const createOrderAfterPay = async (token, merchantUid, impUid, orderItems) => {
    const response = await fetch(apiUrl("/orders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        paymentMethod,
        shipping: {
          receiver: shipping.receiver.trim(),
          phone: shipping.phone.trim(),
          address: shipping.address.trim(),
          detailAddress: shipping.detailAddress.trim(),
          zipCode: shipping.zipCode.trim(),
        },
        // 결제 직후 장바구니가 비어도 주문 가능하도록 스냅샷 전달
        items: orderItems.map((item) => ({
          productId: item.productId || item.product,
          size: item.size,
          quantity: item.quantity,
        })),
        merchantUid,
        impUid,
      }),
    });

    const data = await response.json().catch(() => ({}));

    // 이미 저장된 주문(중복)도 성공으로 처리 → 완료 페이지로 이동
    if (response.status === 409 && data.order) {
      return data;
    }

    if (!response.ok) {
      throw new Error(data.message || "결제는 완료됐지만 주문 저장에 실패했습니다.");
    }

    return data;
  };

  const goComplete = (order, payment, saveError = "") => {
    navigate(
      `/order/complete?no=${encodeURIComponent(order?.orderNumber || "")}`,
      {
        replace: true,
        state: { order, payment, saveError },
      }
    );
  };

  const goFail = (message, merchantUid = "") => {
    navigate("/order/fail", {
      replace: true,
      state: { message, merchantUid },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!shipping.receiver.trim()) {
      setFormError("수령인을 입력해주세요.");
      return;
    }
    if (!shipping.phone.trim()) {
      setFormError("연락처를 입력해주세요.");
      return;
    }
    if (!shipping.address.trim()) {
      setFormError("주소를 입력해주세요.");
      return;
    }
    if (items.length === 0) {
      setFormError("주문할 상품이 없습니다.");
      return;
    }

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

    const merchantUid = `SF_${Date.now()}`;
    const payConfig = getPortOnePayConfig(paymentMethod);
    const fullAddress = [shipping.address.trim(), shipping.detailAddress.trim()]
      .filter(Boolean)
      .join(" ");
    const orderItemsSnapshot = items.map((item) => ({ ...item }));
    const payAmount = Math.round(Number(totalPrice));

    IMP.request_pay(
      {
        ...payConfig,
        merchant_uid: merchantUid,
        name: buildOrderName(orderItemsSnapshot),
        amount: payAmount,
        buyer_email: user?.email || "",
        buyer_name: shipping.receiver.trim(),
        buyer_tel: shipping.phone.trim(),
        buyer_addr: fullAddress,
        buyer_postcode: shipping.zipCode.trim(),
      },
      (rsp) => {
        if (!rsp.success) {
          setSubmitting(false);
          goFail(
            rsp.error_msg || "결제가 취소되었거나 실패했습니다.",
            rsp.merchant_uid || merchantUid
          );
          return;
        }

        createOrderAfterPay(token, rsp.merchant_uid, rsp.imp_uid, orderItemsSnapshot)
          .then(async (data) => {
            await refreshCartCount();
            goComplete(data.order, rsp);
          })
          .catch(async (err) => {
            // 결제는 됐는데 주문 저장 실패해도 완료 페이지로 안내
            await refreshCartCount();
            setFormError(err.message || "주문 처리에 실패했습니다.");
            goComplete(null, rsp, err.message || "주문 저장에 실패했습니다.");
          })
          .finally(() => {
            setSubmitting(false);
          });
      }
    );
  };

  return (
    <div className="home cart-page order-page">
      <HomeNavbar user={user} onLogout={handleLogout} />
      <BackLink to="/cart" label="Back to cart" />

      <div className="cart__wrap">
        <header className="cart__header">
          <p className="cart__eyebrow">STANDFAST</p>
          <h1 className="cart__title">Checkout</h1>
          <p className="cart__sub">배송지와 결제 수단을 확인하고 주문을 완료하세요.</p>
        </header>

        {error === "LOGIN_REQUIRED" ? (
          <div className="cart__empty">
            <p>주문을 진행하려면 로그인이 필요합니다.</p>
            <Link to="/login" className="cart__btn cart__btn--dark">
              LOGIN
            </Link>
          </div>
        ) : error === "EMPTY_CART" ? (
          <div className="cart__empty">
            <p>장바구니가 비어 있어 주문할 수 없습니다.</p>
            <Link to="/cart" className="cart__btn cart__btn--dark">
              GO TO CART
            </Link>
          </div>
        ) : loading ? (
          <p className="cart__status">주문 정보를 불러오는 중…</p>
        ) : error ? (
          <p className="cart__status">{error}</p>
        ) : (
          <form className="cart__layout" onSubmit={handleSubmit}>
            <div className="order__main">
              <section className="order__panel">
                <h2 className="order__panel-title">Shipping</h2>
                <div className="order__fields">
                  <label className="order__field">
                    <span>수령인</span>
                    <input
                      name="receiver"
                      value={shipping.receiver}
                      onChange={handleShippingChange}
                      placeholder="이름"
                      required
                    />
                  </label>
                  <label className="order__field">
                    <span>연락처</span>
                    <input
                      name="phone"
                      value={shipping.phone}
                      onChange={handleShippingChange}
                      placeholder="010-0000-0000"
                      required
                    />
                  </label>
                  <label className="order__field">
                    <span>우편번호</span>
                    <input
                      name="zipCode"
                      value={shipping.zipCode}
                      onChange={handleShippingChange}
                      placeholder="06236"
                    />
                  </label>
                  <label className="order__field order__field--full">
                    <span>주소</span>
                    <input
                      name="address"
                      value={shipping.address}
                      onChange={handleShippingChange}
                      placeholder="기본 주소"
                      required
                    />
                  </label>
                  <label className="order__field order__field--full">
                    <span>상세주소</span>
                    <input
                      name="detailAddress"
                      value={shipping.detailAddress}
                      onChange={handleShippingChange}
                      placeholder="동/호수 등"
                    />
                  </label>
                </div>
              </section>

              <section className="order__panel">
                <h2 className="order__panel-title">Payment</h2>
                <div className="order__pay-options" role="radiogroup" aria-label="결제 수단">
                  {PAYMENT_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`order__pay-option ${
                        paymentMethod === option.value ? "is-active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={() => setPaymentMethod(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="order__panel">
                <h2 className="order__panel-title">Items</h2>
                <ul className="cart__list">
                  {items.map((item) => {
                    const lineTotal = Number(item.price) * Number(item.quantity);
                    return (
                      <li key={item._id} className="cart__row order__item-row">
                        <div className="cart__thumb">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="cart__info">
                          <p className="cart__name">{item.name}</p>
                          <p className="cart__meta">
                            Size {item.size} · Qty {item.quantity}
                          </p>
                          <p className="cart__unit">{formatPrice(item.price)}</p>
                        </div>
                        <p className="cart__line">{formatPrice(lineTotal)}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            <aside className="cart__summary">
              <h2>Order Summary</h2>
              <div className="cart__summary-row">
                <span>Items</span>
                <strong>{items.length}</strong>
              </div>
              <div className="cart__summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <div className="cart__summary-row order__total-row">
                <span>Total</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>
              <p className="cart__note">주문 완료 시 장바구니는 자동으로 비워집니다.</p>

              {formError ? <p className="order__form-error">{formError}</p> : null}

              <button type="submit" className="cart__btn cart__btn--buy" disabled={submitting}>
                {submitting ? "PAYMENT…" : "PLACE ORDER"}
              </button>
              <Link to="/cart" className="cart__keep">
                Back to cart
              </Link>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}

export default Order;
