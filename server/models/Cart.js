import mongoose from "mongoose";

// 장바구니에 담긴 상품 1줄
const cartItemSchema = new mongoose.Schema(
  {
    // Product 문서 참조 (MongoDB _id)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // 상품 비즈니스 ID (예: sf-011)
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    // 담을 당시 상품명 (나중에 상품이 바뀌어도 장바구니에 보이게)
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // 담을 당시 가격
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // 담을 당시 이미지
    image: {
      type: String,
      required: true,
      trim: true,
    },
    // 선택한 사이즈
    size: {
      type: String,
      required: true,
      trim: true,
    },
    // 수량
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: true }
);

// 유저당 장바구니 1개
const cartSchema = new mongoose.Schema(
  {
    // 장바구니 주인 (User)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // 담은 상품 목록
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
export { cartItemSchema };
