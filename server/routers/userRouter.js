import express from "express";
import {
  getUsers,
  getUserById,
  getMe,
  createUser,
  loginUser,
  updateUser,
  deleteUser,
  activateSubscription,
  getAdminSubscribers,
  getAdminCustomers,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// 로그인 (POST /users/login)
userRouter.post("/login", loginUser);

// 토큰으로 내 정보 조회 (GET /users/me)
userRouter.get("/me", authMiddleware, getMe);

// 구독 결제 후 구독자 전환
// POST /users/me/subscribe
userRouter.post("/me/subscribe", authMiddleware, activateSubscription);

// 관리자: 일반 회원 관리 목록
// GET /users/customers
userRouter.get("/customers", authMiddleware, getAdminCustomers);

// 관리자: 구독자 관리 목록
// GET /users/subscribers
userRouter.get("/subscribers", authMiddleware, getAdminSubscribers);

// 유저 전체 조회
userRouter.get("/", getUsers);

// 유저 생성 (회원가입)
userRouter.post("/", createUser);

// 유저 상세 조회
userRouter.get("/:id", getUserById);

// 유저 수정
userRouter.put("/:id", updateUser);

// 유저 삭제
userRouter.delete("/:id", deleteUser);

export default userRouter;
