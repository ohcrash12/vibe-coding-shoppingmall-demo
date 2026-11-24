import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import "./User.css";

function User() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchMe = async () => {
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

        if (data.user?.user_type === "admin") {
          navigate("/admin", { replace: true });
          return;
        }

        setUser(data.user);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="user-page user-page--loading">
        <p>유저 정보 확인 중...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="user-page">
      <header className="user-page__header">
        <Link to="/" className="user-page__logo">
          STANDFAST
        </Link>
        <nav className="user-page__nav">
          <p className="user-page__greeting">{user.name}님</p>
          <button type="button" className="user-page__logout" onClick={handleLogout}>
            Logout
          </button>
          <Link to="/">홈으로</Link>
        </nav>
      </header>

      <main className="user-page__main">
        <BackLink to="/" label="Back" className="back-link-wrap--flush" />
        <h1>My Page</h1>
        <p>회원 정보와 주문 내역을 확인할 수 있는 유저 페이지입니다.</p>

        <section className="user-page__card">
          <h2>내 정보</h2>
          <dl className="user-page__info">
            <div>
              <dt>이름</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{user.address || "등록된 주소가 없습니다."}</dd>
            </div>
          </dl>
        </section>

        <div className="user-page__actions">
          <Link to="/orders" className="user-page__orders-btn">
            주문 내역
          </Link>
        </div>
      </main>
    </div>
  );
}

export default User;
