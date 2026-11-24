import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import { useCart } from "../context/CartContext";
import HomeNavbar from "./home/HomeNavbar";
import "./Home.css";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 이미 로그인된 경우 메인으로 이동
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    const checkToken = async () => {
      try {
        const response = await fetch(apiUrl("/users/me"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          navigate("/", { replace: true });
          return;
        }

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      } catch {
        // 서버 연결 실패 시 로그인 페이지 유지
      } finally {
        setCheckingAuth(false);
      }
    };

    checkToken();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 1) 필수값 검사
    if (!form.email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!form.password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      // 2) 서버 로그인 API 호출
      // POST /users/login → userRouter → loginUser (userController)
      const response = await fetch(apiUrl("/users/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      // 3) 실패 처리 (400/401/500)
      if (!response.ok) {
        throw new Error(data.message || "로그인에 실패했습니다.");
      }

      // 4) 성공 처리: 토큰·유저 정보 저장
      if (!data.token) {
        throw new Error("토큰 발급에 실패했습니다.");
      }

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      // 이전 localStorage 로그인 잔여값 제거
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      await refreshCartCount();
      navigate("/", { replace: true });
    } catch (err) {
      if (err.message === "Failed to fetch") {
        setError("서버에 연결할 수 없습니다. 서버 실행 여부를 확인해 주세요.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="login-page login-page--checking">
        <p>로그인 상태 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <HomeNavbar user={null} />
      <BackLink to="/" label="Back" />

      <div className="login-page__banner">KAKAO PLUS + 10% COUPON</div>

      <main className="login-page__main">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h1 className="login-form__title">LOGIN</h1>

          <input
            className="login-form__input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            autoComplete="email"
          />

          <input
            className="login-form__input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            autoComplete="current-password"
          />

          {error && <p className="login-form__error">{error}</p>}

          <button className="login-form__submit" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="login-form__links">
            <button type="button" className="login-form__link">
              Find ID Password
            </button>
            <Link to="/register" className="login-form__link">
              Create Account
            </Link>
          </div>
        </form>

        <section className="login-benefit">
          <h2 className="login-benefit__title">신규 회원 가입 혜택</h2>
          <ul className="login-benefit__list">
            <li>회원 가입 시 10% 할인 쿠폰 지급</li>
            <li>첫 구매 시 적립금 5,000원 지급</li>
            <li>생일 축하 쿠폰 및 멤버십 등급별 추가 혜택</li>
            <li>무료 교환·반품 서비스 제공</li>
          </ul>
          <button type="button" className="login-benefit__btn">
            멤버십 혜택 보러가기
          </button>
        </section>

        <div className="login-social">
          <button type="button" className="login-social__btn">
            네이버 로그인
          </button>
          <button type="button" className="login-social__btn">
            카카오 로그인
          </button>
        </div>
      </main>

      <footer className="login-page__footer">
        <div className="login-page__footer-inner">
          <div className="login-page__footer-top">
            <p className="login-page__copyright">© 2026 STANDFAST</p>
            <div className="login-page__footer-links">
              <a href="#qa">Q&A</a>
              <a href="#terms">Terms & Conditions</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#shipping">Shipping & Returns</a>
              <a href="#tracking">Order Tracking</a>
            </div>
            <div className="login-page__footer-social">
              <a href="#kakao">Kakao+</a>
              <a href="#instagram">Instagram</a>
            </div>
          </div>
          <p className="login-page__company">
            CEO STANDFAST · Seoul, Korea · Business License 000-00-00000
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Login;
