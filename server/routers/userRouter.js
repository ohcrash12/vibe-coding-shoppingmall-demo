import express from "express";
import {
  getUsers,
  getUserById,
  getMe,
  createUser,
  loginUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// 로그인 (POST /users/login)
userRouter.post("/login", loginUser);

// 토큰으로 내 정보 조회 (GET /users/me)
userRouter.get("/me", authMiddleware, getMe);

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
