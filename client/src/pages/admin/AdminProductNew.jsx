import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../../api";
import BackLink from "../../components/BackLink";
import AdminShell from "./AdminShell";
import "./Admin.css";

const CATEGORIES = ["상의", "하의", "악세사리"];
const SIZES = ["XS", "S", "M", "L", "XL", "FREE"];
const MAX_IMAGES = 4;

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const EMPTY_FORM = {
  productId: "",
  name: "",
  category: "상의",
  price: "",
  images: [],
  sizes: ["M"],
  description: "",
};

function toImages(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter(Boolean).slice(0, MAX_IMAGES);
  }
  const single = product.image || product.imageUrl || "";
  return single ? [single] : [];
}

function AdminProductNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const widgetRef = useRef(null);
  const imagesRef = useRef([]);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    imagesRef.current = form.images;
  }, [form.images]);

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

        if (!response.ok || data.user?.user_type !== "admin") {
          navigate("/", { replace: true });
          return;
        }

        setUser(data.user);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        setAuthLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY_FORM);
      setProductLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setProductLoading(true);
      setError("");

      try {
        const response = await fetch(apiUrl(`/products/${encodeURIComponent(id)}`));
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "상품을 불러오지 못했습니다.");
        }

        const product = data.product || data;
        const sizes = Array.isArray(product.size)
          ? product.size
          : typeof product.size === "string" && product.size.trim()
            ? product.size.split(/[\s,]+/).filter(Boolean)
            : [];

        setForm({
          productId: product.productId || "",
          name: product.name || "",
          category: product.category || "상의",
          price: product.price ?? "",
          images: toImages(product),
          sizes: sizes.length > 0 ? sizes : ["M"],
          description: product.description || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEdit]);

  useEffect(() => {
    if (!window.cloudinary || !CLOUD_NAME || !UPLOAD_PRESET) {
      return;
    }

    widgetRef.current = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        multiple: true,
        maxFiles: MAX_IMAGES,
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
        folding: false,
      },
      (uploadError, result) => {
        if (uploadError) {
          setUploading(false);
          setError("이미지 업로드에 실패했습니다. Cloudinary 설정을 확인해 주세요.");
          return;
        }

        if (result?.event === "queues-start") {
          setUploading(true);
          setError("");
        }

        if (result?.event === "success") {
          const imageUrl = result.info?.secure_url || "";
          if (!imageUrl) return;

          setForm((prev) => {
            if (prev.images.length >= MAX_IMAGES) return prev;
            if (prev.images.includes(imageUrl)) return prev;
            return { ...prev, images: [...prev.images, imageUrl].slice(0, MAX_IMAGES) };
          });
          setUploading(false);
          setError("");
        }

        if (result?.event === "close") {
          setUploading(false);
        }
      }
    );

    return () => {
      widgetRef.current = null;
    };
  }, []);

  const goProducts = () => {
    navigate("/admin", { state: { menu: "products" } });
  };

  const goAdminMenu = (menuId) => {
    navigate("/admin", { state: { menu: menuId } });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleSize = (size) => {
    setForm((prev) => {
      const exists = prev.sizes.includes(size);
      return {
        ...prev,
        sizes: exists ? prev.sizes.filter((item) => item !== size) : [...prev.sizes, size],
      };
    });
  };

  const openCloudinaryWidget = () => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError(
        "Cloudinary 환경변수가 없습니다. client/.env에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET을 넣어 주세요."
      );
      return;
    }

    if (imagesRef.current.length >= MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.`);
      return;
    }

    if (!widgetRef.current) {
      setError("Cloudinary 위젯을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      return;
    }

    // 남은 슬롯만큼만 추가 업로드
    widgetRef.current.update({
      maxFiles: MAX_IMAGES - imagesRef.current.length,
    });
    widgetRef.current.open();
  };

  const removeImageAt = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const clearImages = () => {
    setForm((prev) => ({ ...prev, images: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.productId.trim()) {
      setError("상품 ID를 입력해주세요.");
      return;
    }
    if (!form.name.trim()) {
      setError("상품명을 입력해주세요.");
      return;
    }
    if (form.price === "" || Number(form.price) < 0) {
      setError("상품 가격을 입력해주세요.");
      return;
    }
    if (form.sizes.length === 0) {
      setError("사이즈를 1개 이상 선택해주세요.");
      return;
    }
    if (form.images.length === 0) {
      setError("상품 이미지를 1장 이상 업로드해주세요. (최대 4장)");
      return;
    }

    setSaving(true);

    const payload = {
      productId: form.productId.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      size: form.sizes,
      images: form.images,
      image: form.images[0],
      description: form.description.trim(),
    };

    try {
      const response = await fetch(
        apiUrl(isEdit ? `/products/${encodeURIComponent(id)}` : "/products"),
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || (isEdit ? "상품 수정에 실패했습니다." : "상품 등록에 실패했습니다.")
        );
      }

      alert(data.message || (isEdit ? "상품이 수정되었습니다." : "상품이 등록되었습니다."));
      goProducts();
    } catch (err) {
      if (err.message === "Failed to fetch") {
        setError("서버에 연결할 수 없습니다. server에서 npm run dev 실행 여부를 확인해 주세요.");
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || productLoading) {
    return (
      <div className="admin admin--loading">
        <p>{productLoading ? "상품 정보 불러오는 중..." : "권한 확인 중..."}</p>
      </div>
    );
  }

  const remaining = MAX_IMAGES - form.images.length;

  return (
    <AdminShell user={user} activeMenu="products" onMenuChange={goAdminMenu}>
      <div className="admin-product-page">
        <BackLink to="/admin" label="Back to products" className="back-link-wrap--flush" />
        <header className="admin__header admin-product-page__header">
          <div>
            <h1>PRODUCTS</h1>
            <p>{isEdit ? "상품 상세 · 수정" : "상품 목록 · 등록"}</p>
          </div>
          <button type="button" className="admin__primary-btn" disabled>
            + 상품 추가
          </button>
        </header>

        <div className="admin-product-page__panel admin__panel">
          <p className="admin-product-page__hint">
            {isEdit
              ? "선택한 상품의 등록 내용을 확인하고 수정할 수 있습니다."
              : "상품 목록 위에서 등록 창이 열립니다."}
          </p>
        </div>

        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
          <button type="button" className="admin-modal__backdrop" aria-label="닫기" onClick={goProducts} />

          <form className="admin-modal__card" onSubmit={handleSubmit}>
            <h2 id="product-modal-title">{isEdit ? "상품 상세" : "상품 추가"}</h2>

            <label className="admin-modal__field">
              <span>상품 ID</span>
              <input
                name="productId"
                value={form.productId}
                onChange={handleChange}
                placeholder="예: SF-001"
                required
                readOnly={isEdit}
              />
            </label>

            <label className="admin-modal__field">
              <span>상품명</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="상품명을 입력하세요"
                required
              />
            </label>

            <div className="admin-modal__row">
              <label className="admin-modal__field">
                <span>카테고리</span>
                <select name="category" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-modal__field">
                <span>상품 가격 ₩</span>
                <input
                  name="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="100000"
                  required
                />
              </label>
            </div>

            <div className="admin-modal__field">
              <span>
                상품 이미지 (최대 {MAX_IMAGES}장) · {form.images.length}/{MAX_IMAGES}
              </span>
              <div className="admin-modal__upload">
                <button
                  type="button"
                  className="admin__ghost-btn"
                  onClick={openCloudinaryWidget}
                  disabled={uploading || remaining <= 0}
                >
                  {uploading
                    ? "업로드 중..."
                    : remaining <= 0
                      ? "4장 모두 등록됨"
                      : `Cloudinary로 이미지 추가 (${remaining}장 가능)`}
                </button>
                {form.images.length > 0 ? (
                  <button type="button" className="admin-modal__clear-image" onClick={clearImages}>
                    전체 제거
                  </button>
                ) : null}
              </div>

              {form.images.length > 0 ? (
                <div className="admin-modal__image-grid">
                  {form.images.map((url, index) => (
                    <div key={`${url}-${index}`} className="admin-modal__image-slot">
                      <img src={url} alt={`상품 이미지 ${index + 1}`} />
                      <span className="admin-modal__image-label">
                        {index === 0 ? "대표" : `${index + 1}컷`}
                      </span>
                      <button
                        type="button"
                        className="admin-modal__image-remove"
                        onClick={() => removeImageAt(index)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: remaining }, (_, i) => (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      className="admin-modal__image-empty"
                      onClick={openCloudinaryWidget}
                      disabled={uploading}
                    >
                      + 추가
                    </button>
                  ))}
                </div>
              ) : (
                <p className="admin-modal__preview-empty">
                  상세 페이지 갤러리용으로 최대 4컷까지 업로드할 수 있습니다. 첫 장이 대표 이미지입니다.
                </p>
              )}
            </div>

            <div className="admin-modal__field">
              <span>사이즈 옵션</span>
              <div className="admin-modal__checks">
                {SIZES.map((size) => (
                  <label key={size} className="admin-modal__check">
                    <input
                      type="checkbox"
                      checked={form.sizes.includes(size)}
                      onChange={() => toggleSize(size)}
                    />
                    <span>{size}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="admin-modal__field">
              <span>설명 (선택)</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="상품 설명을 입력하세요"
              />
            </label>

            {error ? <p className="admin-modal__error">{error}</p> : null}

            <div className="admin-modal__actions">
              <button type="button" className="admin__ghost-btn" onClick={goProducts}>
                취소
              </button>
              <button type="submit" className="admin__primary-btn" disabled={saving || uploading}>
                {saving
                  ? isEdit
                    ? "수정 중..."
                    : "등록 중..."
                  : isEdit
                    ? "수정 저장"
                    : "상품 등록"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}

export default AdminProductNew;
