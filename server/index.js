import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import productRouter from "./routers/productRouter.js";
import userRouter from "./routers/userRouter.js";
import authRouter from "./routers/authRouter.js";
import cartRouter from "./routers/cartRouter.js";
import orderRouter from "./routers/orderRouter.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/shopping-mall";
const MONGO_URI = process.env.MONGODB_ATLAS_URL?.trim() || LOCAL_MONGO_URI;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("shopping-mall-server is running");
});

app.use("/products", productRouter);
app.use("/users", userRouter);
app.use("/auth", authRouter);
app.use("/carts", cartRouter);
app.use("/orders", orderRouter);

function describeMongoTarget(uri) {
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    const dbName = parsed.pathname.replace(/^\//, "") || "(default)";
    const isAtlas = uri.startsWith("mongodb+srv://");
    return {
      kind: isAtlas ? "Atlas" : "Local",
      host: parsed.hostname,
      dbName,
    };
  } catch {
    return { kind: "Unknown", host: "-", dbName: "-" };
  }
}

async function start() {
  try {
    const target = describeMongoTarget(MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log(
      `연결성공 [${target.kind}] host=${target.host} db=${target.dbName}`
    );

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB 연결 실패:", error.message);
    process.exit(1);
  }
}

start();
