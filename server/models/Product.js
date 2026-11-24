import mongoose from "mongoose";

const CATEGORIES = ["상의", "하의", "악세사리"];
const MAX_IMAGES = 4;

const productSchema = new mongoose.Schema(
  {
    // 상품 ID (MongoDB _id와 별도, 항상 유니크)
    productId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // 상품 이름
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // 상품 가격
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // 카테고리: 상의 | 하의 | 악세사리
    category: {
      type: String,
      required: true,
      enum: {
        values: CATEGORIES,
        message: "카테고리는 상의, 하의, 악세사리 중 하나여야 합니다.",
      },
    },
    // 상품 사이즈 (예: S, M, L 또는 여러 개)
    size: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "상품 사이즈를 1개 이상 입력해주세요.",
      },
    },
    // 상품 이미지 URL (최대 4장) — outstanding 스타일 갤러리용
    images: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length >= 1 &&
            value.length <= MAX_IMAGES &&
            value.every((url) => typeof url === "string" && url.trim())
          );
        },
        message: "상품 이미지는 1~4장까지 등록할 수 있습니다.",
      },
    },
    // 대표 이미지 (images[0], 목록/장바구니 호환용)
    image: {
      type: String,
      required: true,
      trim: true,
    },
    // 설명 (선택)
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
export { CATEGORIES, MAX_IMAGES };
