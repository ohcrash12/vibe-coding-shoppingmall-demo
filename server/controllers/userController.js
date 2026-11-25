import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Order from "../models/Order.js";
import User from "../models/User.js";

const SALT_ROUNDS = 10;
const SUBSCRIBE_PRICE = 10000;

// 응답에서 비밀번호 제외
const toSafeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const { password, ...safeUser } = userObj;
  return safeUser;
};

// 구독 만료 시 일반 회원으로 되돌림
const syncSubscriptionStatus = async (user) => {
  if (!user || user.user_type !== "subscriber") return user;

  const expiresAt = user.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt)
    : null;

  if (expiresAt && expiresAt.getTime() < Date.now()) {
    user.user_type = "customer";
    user.subscriptionExpiresAt = null;
    user.subscriptionPaidAt = null;
    await user.save();
  }

  return user;
};

// 유저 전체 조회
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "유저 조회에 실패했습니다.", error: error.message });
  }
};

// 유저 상세 조회
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json(toSafeUser(user));
  } catch (error) {
    res.status(500).json({ message: "유저 조회에 실패했습니다.", error: error.message });
  }
};

// 토큰으로 내 정보 조회
export const getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    user = await syncSubscriptionStatus(user);

    res.status(200).json({
      message: "유저 정보를 조회했습니다.",
      user: toSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "유저 정보 조회에 실패했습니다.", error: error.message });
  }
};

const isValidName = (name) => /^[가-힣a-zA-Z]{2,20}$/.test(name);
// 이메일: 소문자만 허용
const isValidEmail = (email) =>
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);
const isValidPassword = (password) => {
  if (password.length < 10 || password.length > 16) return false;

  // 영문 대문자 / 숫자 / 특수문자 중 2가지 이상
  let types = 0;
  if (/[A-Z]/.test(password)) types += 1;
  if (/[0-9]/.test(password)) types += 1;
  if (/[^a-zA-Z0-9]/.test(password)) types += 1;

  return types >= 2;
};

// 로그인 (이메일 + 비밀번호)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "이메일을 입력해주세요." });
    }

    if (!password) {
      return res.status(400).json({ message: "비밀번호를 입력해주세요." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const syncedUser = await syncSubscriptionStatus(user);
    const secret = process.env.JWT_SECRET;

    const token = jwt.sign(
      {
        id: syncedUser._id,
        email: syncedUser.email,
        user_type: syncedUser.user_type,
      },
      secret,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "로그인에 성공했습니다.",
      token,
      user: toSafeUser(syncedUser),
    });
  } catch (error) {
    res.status(500).json({ message: "로그인에 실패했습니다.", error: error.message });
  }
};

// 유저 생성 (회원가입)
export const createUser = async (req, res) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "이름을 입력해주세요." });
    }

    if (!isValidName(name.trim())) {
      return res.status(400).json({ message: "이름은 한글 또는 영문 2~20자로 입력해주세요." });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "이메일을 입력해주세요." });
    }

    if (email.trim() !== email.trim().toLowerCase()) {
      return res.status(400).json({ message: "이메일은 소문자만 입력할 수 있습니다." });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        message: "올바른 이메일 형식(소문자)으로 입력해주세요.",
      });
    }

    if (!password) {
      return res.status(400).json({ message: "비밀번호를 입력해주세요." });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "비밀번호는 영문 대문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자로 입력해주세요.",
      });
    }

    // 공개 회원가입은 일반 회원만 허용 (관리자/구독자는 별도 경로)
    const nextType =
      user_type === "admin" || user_type === "subscriber" ? "customer" : "customer";

    // 비밀번호 암호화 후 저장
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email: email.trim(),
      name: name.trim(),
      password: hashedPassword,
      user_type: nextType,
      address: address || "",
    });

    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      user: toSafeUser(user),
    });
  
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    res.status(500).json({ message: "유저 생성에 실패했습니다.", error: error.message });
  }
};

// 유저 수정
export const updateUser = async (req, res) => {
  try {
    const { email, name, password, user_type, address } = req.body;
    const updateData = {};

    if (email !== undefined) {
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "이메일을 입력해주세요." });
      }
      updateData.email = email.trim();
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "이름을 입력해주세요." });
      }
      updateData.name = name.trim();
    }

    if (password !== undefined) {
      if (!password) {
        return res.status(400).json({ message: "비밀번호를 입력해주세요." });
      }
      if (!isValidPassword(password)) {
        return res.status(400).json({
          message:
            "비밀번호는 영문 대문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자로 입력해주세요.",
        });
      }
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (user_type !== undefined) {
      updateData.user_type = user_type;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json(toSafeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "이미 사용 중인 이메일입니다." });
    }

    res.status(500).json({ message: "유저 수정에 실패했습니다.", error: error.message });
  }
};

// 유저 삭제
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ message: "유저가 삭제되었습니다.", user });
  } catch (error) {
    res.status(500).json({ message: "유저 삭제에 실패했습니다.", error: error.message });
  }
};

// 관리자: 일반 회원 목록 + 주문 매출
// GET /users/customers
export const getAdminCustomers = async (req, res) => {
  try {
    if (req.user?.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 조회할 수 있습니다." });
    }

    const customers = await User.find({ user_type: "customer" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const ids = customers.map((u) => u._id);

    const salesByUser = ids.length
      ? await Order.aggregate([
          {
            $match: {
              user: { $in: ids },
              status: { $in: ["paid", "shipping", "delivered"] },
            },
          },
          {
            $group: {
              _id: "$user",
              orderSales: { $sum: "$totalPrice" },
              orderCount: { $sum: 1 },
            },
          },
        ])
      : [];

    const salesMap = new Map(
      salesByUser.map((row) => [
        String(row._id),
        {
          orderSales: row.orderSales || 0,
          orderCount: row.orderCount || 0,
        },
      ])
    );

    const list = customers.map((user) => {
      const sales = salesMap.get(String(user._id)) || {
        orderSales: 0,
        orderCount: 0,
      };

      return {
        ...user,
        orderSales: sales.orderSales,
        orderCount: sales.orderCount,
      };
    });

    const summary = list.reduce(
      (acc, row) => {
        acc.customerCount += 1;
        acc.totalOrderCount += row.orderCount;
        acc.totalOrderSales += row.orderSales;
        if (row.orderCount > 0) acc.purchasedCount += 1;
        return acc;
      },
      {
        customerCount: 0,
        purchasedCount: 0,
        totalOrderCount: 0,
        totalOrderSales: 0,
      }
    );

    res.status(200).json({ customers: list, summary });
  } catch (error) {
    res.status(500).json({
      message: "회원 목록 조회에 실패했습니다.",
      error: error.message,
    });
  }
};

// 관리자: 구독자 목록 + 매출·구독 횟수
// GET /users/subscribers
export const getAdminSubscribers = async (req, res) => {
  try {
    if (req.user?.user_type !== "admin") {
      return res.status(403).json({ message: "관리자만 조회할 수 있습니다." });
    }

    const subscribers = await User.find({
      $or: [
        { user_type: "subscriber" },
        { subscriptionCount: { $gt: 0 } },
      ],
    })
      .select("-password")
      .sort({ subscriptionPaidAt: -1, createdAt: -1 })
      .lean();

    const ids = subscribers.map((u) => u._id);

    const salesByUser = ids.length
      ? await Order.aggregate([
          {
            $match: {
              user: { $in: ids },
              status: { $in: ["paid", "shipping", "delivered"] },
            },
          },
          {
            $group: {
              _id: "$user",
              orderSales: { $sum: "$totalPrice" },
              orderCount: { $sum: 1 },
            },
          },
        ])
      : [];

    const salesMap = new Map(
      salesByUser.map((row) => [
        String(row._id),
        {
          orderSales: row.orderSales || 0,
          orderCount: row.orderCount || 0,
        },
      ])
    );

    const list = subscribers.map((user) => {
      const sales = salesMap.get(String(user._id)) || {
        orderSales: 0,
        orderCount: 0,
      };
      // 기존 구독자(카운트 미기록)는 최소 1회로 표시
      const rawCount = Number(user.subscriptionCount) || 0;
      const subscriptionCount =
        rawCount > 0 ? rawCount : user.user_type === "subscriber" ? 1 : 0;
      const subscriptionRevenue = subscriptionCount * SUBSCRIBE_PRICE;
      const totalSales = sales.orderSales + subscriptionRevenue;
      const expiresAt = user.subscriptionExpiresAt
        ? new Date(user.subscriptionExpiresAt)
        : null;
      const isActive =
        user.user_type === "subscriber" &&
        (!expiresAt || expiresAt.getTime() >= Date.now());

      return {
        ...user,
        subscriptionCount,
        orderSales: sales.orderSales,
        orderCount: sales.orderCount,
        subscriptionRevenue,
        totalSales,
        isActive,
      };
    });

    const summary = list.reduce(
      (acc, row) => {
        acc.subscriberCount += 1;
        acc.activeCount += row.isActive ? 1 : 0;
        acc.totalSubscriptionCount += row.subscriptionCount;
        acc.totalOrderSales += row.orderSales;
        acc.totalSubscriptionRevenue += row.subscriptionRevenue;
        acc.totalSales += row.totalSales;
        return acc;
      },
      {
        subscriberCount: 0,
        activeCount: 0,
        totalSubscriptionCount: 0,
        totalOrderSales: 0,
        totalSubscriptionRevenue: 0,
        totalSales: 0,
      }
    );

    res.status(200).json({ subscribers: list, summary });
  } catch (error) {
    res.status(500).json({
      message: "구독자 목록 조회에 실패했습니다.",
      error: error.message,
    });
  }
};

// 구독 결제 성공 후 구독자 전환
// POST /users/me/subscribe
// body: { impUid?, merchantUid?, days? }
export const activateSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "유저를 찾을 수 없습니다." });
    }

    if (user.user_type === "admin") {
      return res.status(400).json({ message: "관리자 계정은 구독 전환할 수 없습니다." });
    }

    const days = Number(req.body?.days) > 0 ? Number(req.body.days) : 30;
    const paidAt = new Date();
    const expiresAt = new Date(paidAt);
    expiresAt.setDate(expiresAt.getDate() + days);

    user.user_type = "subscriber";
    user.subscriptionPaidAt = paidAt;
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionCount = (Number(user.subscriptionCount) || 0) + 1;
    await user.save();

    const secret = process.env.JWT_SECRET;
    const token = secret
      ? jwt.sign(
          {
            id: user._id,
            email: user.email,
            user_type: user.user_type,
          },
          secret,
          { expiresIn: "7d" }
        )
      : null;

    res.status(200).json({
      message: "구독이 활성화되었습니다.",
      user: toSafeUser(user),
      token,
      subscription: {
        paidAt,
        expiresAt,
        merchantUid: req.body?.merchantUid || "",
        impUid: req.body?.impUid || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "구독 활성화에 실패했습니다.",
      error: error.message,
    });
  }
};
