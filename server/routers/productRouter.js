import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

const productRouter = express.Router();

// 상품 전체 조회
// GET /products?all=true          → 전체 상품 (메인 Home)
// GET /products?page=1&limit=2    → 페이지네이션 (기본 limit=2, Admin)
productRouter.get("/", getProducts);

// 상품 등록 API
// POST /products
// body: { productId, name, price, category, size[], image, description? }
// → controllers/productController.createProduct → models/Product.js
productRouter.post("/", createProduct);

// 상품 상세 조회 (GET /products/:id) — MongoDB _id 또는 productId
productRouter.get("/:id", getProductById);

// 상품 수정 (PUT /products/:id)
productRouter.put("/:id", updateProduct);

// 상품 삭제 (DELETE /products/:id)
productRouter.delete("/:id", deleteProduct);

export default productRouter;
