import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/,
        "이메일은 소문자 형식만 입력할 수 있습니다.",
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // customer: 일반 회원, subscriber: 구독자, admin: 관리자
    user_type: {
      type: String,
      required: true,
      enum: {
        values: ["customer", "subscriber", "admin"],
        message: "회원 유형은 customer, subscriber, admin 중 하나여야 합니다.",
      },
      default: "customer",
    },
    address: {
      type: String,
      default: "",
    },
    // 구독 결제일
    subscriptionPaidAt: {
      type: Date,
      default: null,
    },
    // 구독 만료일 (결제 후 30일)
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    // 누적 구독 횟수
    subscriptionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
