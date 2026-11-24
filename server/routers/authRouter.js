import express from "express";
import { loginUser } from "../controllers/authController.js";

const authRouter = express.Router();

// 로그인
authRouter.post("/login", loginUser);

export default authRouter;
