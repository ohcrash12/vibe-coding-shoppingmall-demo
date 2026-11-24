import mongoose from "mongoose";

const ORDER_STATUS = ["pending", "paid", "shipping", "delivered", "cancelled"];
const PAYMENT_METHODS = ["card", "bank", "kakao"];

// 주문 상품 1줄 (주문 당시 스냅샷)
const orderItemSchema = new mongoose.Schema(
  {
    // Product 문서 참조
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
    // 주문 당시 상품명
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // 주문 당시 단가
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // 주문 당시 대표 이미지
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
    // 줄 합계 (price × quantity)
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

// 배송 정보
const shippingSchema = new mongoose.Schema(
  {
    // 수령인
    receiver: {
      type: String,
      required: true,
      trim: true,
    },
    // 연락처
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    // 주소
    address: {
      type: String,
      required: true,
      trim: true,
    },
    // 상세주소 (선택)
    detailAddress: {
      type: String,
      default: "",
      trim: true,
    },
    // 우편번호 (선택)
    zipCode: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // 주문번호 (예: SF-20261123-0001)
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // 주문자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 주문 상품 목록
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "주문 상품이 1개 이상 필요합니다.",
      },
    },
    // 배송지
    shipping: {
      type: shippingSchema,
      required: true,
    },
    // 주문 상태
    status: {
      type: String,
      required: true,
      enum: {
        values: ORDER_STATUS,
        message: "주문 상태가 올바르지 않습니다.",
      },
      default: "pending",
    },
    // 결제 수단
    paymentMethod: {
      type: String,
      required: true,
      enum: {
        values: PAYMENT_METHODS,
        message: "결제 수단은 card, bank, kakao 중 하나여야 합니다.",
      },
    },
    // 포트원 결제 고유번호 (중복 주문 방지)
    impUid: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    // 가맹점 주문번호 (IMP.request_pay merchant_uid)
    merchantUid: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    // 상품 합계
    itemsTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    // 최종 결제 금액
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
export { ORDER_STATUS, PAYMENT_METHODS, orderItemSchema, shippingSchema };
