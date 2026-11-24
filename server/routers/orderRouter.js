import express from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const orderRouter = express.Router();

// 주문 API는 로그인 필요
orderRouter.use(authMiddleware);

// 주문 목록
// GET /orders  (일반: 내 주문, 관리자: 전체)
orderRouter.get("/", getOrders);

// 주문 생성
// POST /orders
// body: { shipping, paymentMethod, items? }
// items 없으면 장바구니 상품으로 주문 + 장바구니 비움
orderRouter.post("/", createOrder);

// 주문 상세
// GET /orders/:id  (_id 또는 orderNumber)
orderRouter.get("/:id", getOrderById);

// 주문 수정 (상태 / 배송지)
// PUT /orders/:id
// body: { status?, shipping? }
orderRouter.put("/:id", updateOrder);

// 주문 삭제 (pending / cancelled 만)
// DELETE /orders/:id
orderRouter.delete("/:id", deleteOrder);

export default orderRouter;
