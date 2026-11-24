import express from "express";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../controllers/cartController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const cartRouter = express.Router();

// 장바구니 API는 로그인 필요 (토큰: Authorization: Bearer ...)
cartRouter.use(authMiddleware);

// 내 장바구니 조회
// GET /carts
cartRouter.get("/", getCart);

// 장바구니에 상품 담기
// POST /carts/items
// body: { productId, size, quantity? }
cartRouter.post("/items", addCartItem);

// 장바구니 상품 수량 수정
// PUT /carts/items/:itemId
// body: { quantity }
cartRouter.put("/items/:itemId", updateCartItem);

// 장바구니 상품 1개 삭제
// DELETE /carts/items/:itemId
cartRouter.delete("/items/:itemId", removeCartItem);

// 장바구니 전체 비우기
// DELETE /carts
cartRouter.delete("/", clearCart);

export default cartRouter;
