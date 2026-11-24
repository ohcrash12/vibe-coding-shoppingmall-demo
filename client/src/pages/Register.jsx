import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import BackLink from "../components/BackLink";
import "./Register.css";

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 4.3 3.3 3l18 18-1.3 1.3-3.2-3.2A11.7 11.7 0 0 1 12 19c-7 0-10-7-10-7a18.6 18.6 0 0 1 5.1-5.5L2 4.3zm7.1 7.1A3 3 0 0 0 12 15a3 3 0 0 0 2.6-1.5l-3.5-3.5zM12 5c7 0 10 7 10 7a18.3 18.3 0 0 1-4.2 4.8l-1.5-1.5A10 10 0 0 0 20.1 12S17.3 7 12 7a9.4 9.4 0 0 0-3.3.6L7.1 6A12.2 12.2 0 0 1 12 5z"
      />
    </svg>
  );

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      fill="currentColor"
      d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"
    />
  </svg>
);

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // userController / User 스키마 기준
  // 필수: email, name, password, user_type(기본 customer)
  // 선택: address
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    zipCode: "",
    address1: "",
    address2: "",
    user_type: "customer",
    agreeTerms: false,
    agreePrivacy: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 다음(카카오) 우편번호 검색 팝업
  const openAddressSearch = () => {
    if (!window.daum?.Postcode) {
      setError("주소 검색 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const baseAddress =
          data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

        setForm((prev) => ({
          ...prev,
          zipCode: data.zonecode,
          address1: baseAddress,
        }));
      },
    }).open();
  };

  // 이름: 한글/영문, 2~20자
  const isValidName = (name) => /^[가-힣a-zA-Z]{2,20}$/.test(name);

  // 이메일 형식: 소문자만 허용
  const isValidEmail = (email) =>
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);

  // 비밀번호: 영문 대문자 / 숫자 / 특수문자 중 2가지 이상 + 10~16자
  const isValidPassword = (password) => {
    if (password.length < 10 || password.length > 16) return false;

    let types = 0;
    if (/[A-Z]/.test(password)) types += 1;
    if (/[0-9]/.test(password)) types += 1;
    if (/[^a-zA-Z0-9]/.test(password)) types += 1;

    return types >= 2;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 필수값 검사
    if (!form.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!isValidName(form.name.trim())) {
      setError("이름은 한글 또는 영문 2~20자로 입력해주세요.");
      return;
    }

    if (!form.email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (form.email.trim() !== form.email.trim().toLowerCase()) {
      setError("이메일은 소문자만 입력할 수 있습니다.");
      return;
    }

    if (!isValidEmail(form.email.trim())) {
      setError("올바른 이메일 형식(소문자)으로 입력해주세요.");
      return;
    }

    if (!form.password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    if (!isValidPassword(form.password)) {
      setError(
        "비밀번호는 영문 대문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자로 입력해주세요."
      );
      return;
    }

    if (!form.confirmPassword) {
      setError("비밀번호 확인을 입력해주세요.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!form.agreeTerms) {
      setError("이용약관에 동의해주세요.");
      return;
    }

    if (!form.agreePrivacy) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    // address는 필수가 아님 → 입력된 값만 합침
    const address = [form.zipCode, form.address1, form.address2]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    // 2) 서버로 보낼 데이터 (createUser가 받는 필드)
    const payload = {
      email: form.email.trim(),
      name: form.name.trim(),
      password: form.password,
      user_type: form.user_type || "customer",
      address,
    };

    setLoading(true);

    try {
      // 3) POST /users → userRouter → createUser → MongoDB 저장
      const response = await fetch(apiUrl("/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "회원가입에 실패했습니다.");
      }

      // 4) 저장 성공
      alert(data.message || "회원가입이 완료되었습니다.");
      navigate("/");
    } catch (err) {
      if (err.message === "Failed to fetch") {
        setError("서버에 연결할 수 없습니다. 서버(npm run dev)와 MongoDB를 확인해 주세요.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register">
      <form className="register__form" onSubmit={handleSubmit} noValidate>
        <div className="register__top">
          <BackLink to="/" label="Back" className="back-link-wrap--flush" />
          <h1 className="register__title">CREATE ACCOUNT</h1>
        </div>

        <label className="field">
          <span className="field__label">
            이름 <span className="field__required">필수</span>
          </span>
          <input
            className="field__input"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">
            이메일 <span className="field__required">필수</span>
          </span>
          <input
            className="field__input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">
            비밀번호 <span className="field__required">필수</span>
          </span>
          <div className="field__control">
            <input
              className="field__input"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="field__icon-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label="비밀번호 표시"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          <span className="field__hint">
            (영문 대문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자)
          </span>
        </label>

        <label className="field">
          <span className="field__label">
            비밀번호 확인 <span className="field__required">필수</span>
          </span>
          <div className="field__control">
            <input
              className="field__input"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="field__icon-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label="비밀번호 확인 표시"
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
        </label>

        <label className="field">
          <span className="field__label">
            우편번호 <span className="field__optional">선택</span>
          </span>
          <div className="field__control">
            <input
              className="field__input"
              type="text"
              name="zipCode"
              value={form.zipCode}
              readOnly
              onClick={openAddressSearch}
              placeholder="우편번호 검색"
            />
            <button
              type="button"
              className="field__icon-btn"
              aria-label="우편번호 검색"
              onClick={openAddressSearch}
            >
              <SearchIcon />
            </button>
          </div>
        </label>

        <div className="field">
          <span className="field__label">
            주소 <span className="field__optional">선택</span>
          </span>
          <input
            className="field__input"
            type="text"
            name="address1"
            value={form.address1}
            readOnly
            onClick={openAddressSearch}
            autoComplete="address-line1"
            placeholder="기본 주소"
          />
          <input
            className="field__input field__input--stack"
            type="text"
            name="address2"
            value={form.address2}
            onChange={handleChange}
            autoComplete="address-line2"
            placeholder="상세 주소"
          />
        </div>

        <section className="agree">
          <div className="agree__copy">
            <h2 className="agree__title">
              Agreement <span className="field__required">(필수)</span>
            </h2>
            <label className="agree__check">
              <span>이용약관에 동의하십니까?</span>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
                required
              />
              <span>동의함</span>
            </label>
          </div>
          <button type="button" className="agree__view">
            View
          </button>
        </section>

        <section className="agree">
          <div className="agree__copy">
            <h2 className="agree__title">
              Privacy Policy <span className="field__required">(필수)</span>
            </h2>
            <label className="agree__check">
              <span>개인정보 수집 및 이용에 동의하십니까?</span>
              <input
                type="checkbox"
                name="agreePrivacy"
                checked={form.agreePrivacy}
                onChange={handleChange}
                required
              />
              <span>동의함</span>
            </label>
          </div>
          <button type="button" className="agree__view">
            View
          </button>
        </section>

        {error && <p className="register__error">{error}</p>}

        <button className="register__submit" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
    </main>
  );
}

export default Register;
