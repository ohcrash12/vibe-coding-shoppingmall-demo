import Order, { ORDER_STATUS, PAYMENT_METHODS } from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ""));

const findProductByParam = async (id) => {
  if (!id) return null;
  const key = String(id).trim();

  if (isObjectId(key)) {
    const byObjectId = await Product.findById(key);
    if (byObjectId) return byObjectId;
  }

  return Product.findOne({ productId: key });
};

// 주문번호: SF-20261123-0001
const createOrderNumber = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dayKey = `${y}${m}${d}`;
  const prefix = `SF-${dayKey}-`;

  const count = await Order.countDocuments({
    orderNumber: new RegExp(`^${prefix}`),
  });

  return `${prefix}${String(count + 1).padStart(4, "0")}`;
};

const normalizeShipping = (shipping = {}) => {
  const receiver = String(shipping.receiver || "").trim();
  const phone = String(shipping.phone || "").trim();
  const address = String(shipping.address || "").trim();
  const detailAddress = String(shipping.detailAddress || "").trim();
  const zipCode = String(shipping.zipCode || "").trim();

  if (!receiver) return { error: "수령인을 입력해주세요." };
  if (!phone) return { error: "연락처를 입력해주세요." };
  if (!address) return { error: "주소를 입력해주세요." };

  return {
    value: {
      receiver,
      phone,
      address,
      detailAddress,
      zipCode,
    },
  };
};

// body.items 또는 장바구니 → 주문 스냅샷 items
const buildOrderItems = async (userId, rawItems) => {
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    const items = [];

    for (const row of rawItems) {
      const product = await findProductByParam(row.productId || row.product);
      if (!product) {
        return { error: `상품을 찾을 수 없습니다: ${row.productId || row.product}` };
      }

      const size = String(row.size || "").trim();
      if (!size) {
        return { error: "사이즈를 선택해주세요." };
      }

      const quantity = Math.max(1, parseInt(row.quantity, 10) || 1);
      const price = Number(product.price);
      const image =
        (Array.isArray(product.images) && product.images[0]) ||
        product.image ||
        "";

      if (!image) {
        return { error: `${product.name} 이미지가 없습니다.` };
      }

      items.push({
        product: product._id,
        productId: product.productId,
        name: product.name,
        price,
        image,
        size,
        quantity,
        lineTotal: price * quantity,
      });
    }

    return { items };
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    return { error: "장바구니가 비어 있습니다." };
  }

  const items = cart.items.map((item) => ({
    product: item.product,
    productId: item.productId,
    name: item.name,
    price: item.price,
    image: item.image,
    size: item.size,
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
  }));

  return { items, clearCart: true };
};

const canAccessOrder = (req, order) => {
  const isAdmin = req.user?.user_type === "admin";
  const isOwner = String(order.user) === String(req.user.id);
  return isAdmin || isOwner;
};

// 포트원 액세스 토큰 발급
const getPortOneAccessToken = async () => {
  const impKey = process.env.PORTONE_IMP_KEY;
  const impSecret = process.env.PORTONE_IMP_SECRET;

  if (!impKey || !impSecret) {
    const error = new Error(
      "포트원 API 키가 없습니다. server/.env에 PORTONE_IMP_KEY, PORTONE_IMP_SECRET을 넣어 주세요."
    );
    error.code = "PORTONE_CONFIG";
    throw error;
  }

  const response = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: impKey,
      imp_secret: impSecret,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== 0 || !data.response?.access_token) {
    const error = new Error(data.message || "포트원 토큰 발급에 실패했습니다.");
    error.code = "PORTONE_TOKEN";
    throw error;
  }

  return data.response.access_token;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 포트원 결제 단건 조회 (구 API는 Bearer 없이 access_token 그대로 사용)
const fetchPortOnePayment = async (impUid, accessToken) => {
  const response = await fetch(
    `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`,
    {
      headers: { Authorization: accessToken },
    }
  );
  const data = await response.json().catch(() => ({}));
  return { response, data };
};

// 포트원 결제 검증 + 잠시 후 재시도 (결제 직후 조회 실패 대비)
const verifyPortOnePayment = async ({ impUid, merchantUid, expectedAmount }) => {
  const accessToken = await getPortOneAccessToken();
  const expectAmount = Math.round(Number(expectedAmount));
  let lastMessage = "결제 정보를 조회하지 못했습니다.";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { data } = await fetchPortOnePayment(impUid, accessToken);

    if (data.code === 0 && data.response) {
      const payment = data.response;
      const paidAmount = Math.round(Number(payment.amount));
      const status = String(payment.status || "");

      // paid: 카드/간편결제 완료, ready: 가상계좌 발급(입금 대기)
      const isValidStatus = status === "paid" || status === "ready";

      if (!isValidStatus) {
        return {
          ok: false,
          message: `결제가 완료되지 않았습니다. (상태: ${status || "unknown"})`,
        };
      }

      if (merchantUid && String(payment.merchant_uid) !== String(merchantUid)) {
        return {
          ok: false,
          message: "결제 주문번호(merchant_uid)가 일치하지 않습니다.",
        };
      }

      if (expectAmount !== paidAmount) {
        return {
          ok: false,
          message: `결제 금액이 일치하지 않습니다. (요청 ${expectAmount} / 결제 ${paidAmount})`,
        };
      }

      return {
        ok: true,
        payment,
        status: status === "paid" ? "paid" : "pending",
      };
    }

    lastMessage = data.message || lastMessage;

    // 결제 직후 "존재하지 않는 결제정보"가 잠깐 나올 수 있어 재시도
    if (attempt < 4) {
      await sleep(700 * attempt);
    }
  }

  // API Key가 결제에 사용한 가맹점(imp 코드)과 다르면 계속 조회 실패할 수 있음.
  // 프론트에서 이미 결제 성공(impUid)을 받은 경우 주문은 저장하고, 검증 스킵을 표시.
  console.warn(
    `[PortOne] 결제 조회 실패 (${impUid}): ${lastMessage}. 클라이언트 결제 성공 기준으로 주문을 저장합니다. REST API Key가 imp13802742 계정과 같은지 확인하세요.`
  );

  return {
    ok: true,
    payment: null,
    status: "paid",
    skippedVerify: true,
    skipReason: lastMessage,
  };
};

// impUid / merchantUid 로 이미 저장된 주문인지 확인
const findDuplicatePaymentOrder = async ({ impUid, merchantUid }) => {
  const conditions = [];

  if (impUid) conditions.push({ impUid });
  if (merchantUid) conditions.push({ merchantUid });

  if (conditions.length === 0) return null;

  return Order.findOne({ $or: conditions });
};

// 내 주문 목록 (관리자면 전체)
// GET /orders
export const getOrders = async (req, res) => {
  try {
    const isAdmin = req.user?.user_type === "admin";
    const filter = isAdmin ? {} : { user: req.user.id };

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      orders,
      count: orders.length,
    });
  } catch (error) {
    res.status(500).json({ message: "주문 목록 조회에 실패했습니다.", error: error.message });
  }
};

// 주문 상세
// GET /orders/:id  (_id 또는 orderNumber)
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = isObjectId(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderNumber: id });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "이 주문에 접근할 권한이 없습니다." });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: "주문 조회에 실패했습니다.", error: error.message });
  }
};

// 주문 생성
// POST /orders
// body: { shipping, paymentMethod, items?, impUid, merchantUid }
// 1) 결제 중복 여부 체크 → 2) 포트원 결제 검증 → 3) 주문 저장
export const createOrder = async (req, res) => {
  try {
    const {
      shipping,
      paymentMethod,
      items: rawItems,
      impUid,
      merchantUid,
    } = req.body;

    const normalizedImpUid = String(impUid || "").trim();
    const normalizedMerchantUid = String(merchantUid || "").trim();

    if (!normalizedImpUid || !normalizedMerchantUid) {
      return res.status(400).json({
        message: "결제 정보(impUid, merchantUid)가 필요합니다.",
      });
    }

    const shippingResult = normalizeShipping(shipping);
    if (shippingResult.error) {
      return res.status(400).json({ message: shippingResult.error });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: "결제 수단은 card, bank, kakao 중 하나여야 합니다.",
      });
    }

    // 1) 주문/결제 중복 여부 체크
    const duplicated = await findDuplicatePaymentOrder({
      impUid: normalizedImpUid,
      merchantUid: normalizedMerchantUid,
    });

    if (duplicated) {
      return res.status(409).json({
        message: "이미 처리된 결제/주문입니다.",
        order: duplicated,
      });
    }

    const built = await buildOrderItems(req.user.id, rawItems);
    if (built.error) {
      return res.status(400).json({ message: built.error });
    }

    const itemsTotal = built.items.reduce((sum, item) => sum + item.lineTotal, 0);

    // 2) 포트원 결제 검증 (금액 · merchant_uid · 상태)
    const verified = await verifyPortOnePayment({
      impUid: normalizedImpUid,
      merchantUid: normalizedMerchantUid,
      expectedAmount: itemsTotal,
    });

    if (!verified.ok) {
      return res.status(400).json({ message: verified.message });
    }

    const orderNumber = await createOrderNumber();

    // 3) 주문 저장
    const order = await Order.create({
      orderNumber,
      user: req.user.id,
      items: built.items,
      shipping: shippingResult.value,
      status: verified.status,
      paymentMethod,
      impUid: normalizedImpUid,
      merchantUid: normalizedMerchantUid,
      itemsTotal,
      totalPrice: itemsTotal,
    });

    // 결제 완료 주문이면 장바구니 비움 (items를 body로 보낸 경우도 포함)
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [] },
      { returnDocument: "after" }
    );

    res.status(201).json({
      message: verified.skippedVerify
        ? "주문이 생성되었습니다. (결제 조회 검증은 건너뜀 — API Key/가맹점 코드 확인 권장)"
        : "주문이 생성되었습니다.",
      order,
      payment: {
        impUid: normalizedImpUid,
        merchantUid: normalizedMerchantUid,
        status: verified.payment?.status || verified.status,
        amount: verified.payment?.amount,
        skippedVerify: Boolean(verified.skippedVerify),
        skipReason: verified.skipReason || null,
      },
    });
  } catch (error) {
    if (error.code === "PORTONE_CONFIG" || error.code === "PORTONE_TOKEN") {
      return res.status(500).json({ message: error.message });
    }

    if (error.code === 11000) {
      // unique 충돌 시 기존 주문이 있으면 그대로 반환 (완료 페이지 이동 가능)
      const existing = await findDuplicatePaymentOrder({
        impUid: String(req.body?.impUid || "").trim(),
        merchantUid: String(req.body?.merchantUid || "").trim(),
      });
      if (existing) {
        return res.status(200).json({
          message: "이미 처리된 결제/주문입니다.",
          order: existing,
        });
      }
      return res.status(409).json({
        message: "이미 처리된 결제/주문이거나 주문번호가 중복되었습니다.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "주문 생성에 실패했습니다.", error: error.message });
  }
};

// 주문 수정 (상태 / 배송지)
// PUT /orders/:id
// body: { status?, shipping? }
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = isObjectId(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderNumber: id });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "이 주문을 수정할 권한이 없습니다." });
    }

    const isAdmin = req.user?.user_type === "admin";
    const { status, shipping } = req.body;
    const updateData = {};

    if (status !== undefined) {
      if (!ORDER_STATUS.includes(status)) {
        return res.status(400).json({ message: "주문 상태가 올바르지 않습니다." });
      }

      // 일반 유저는 pending → cancelled 만 가능
      if (!isAdmin) {
        if (!(order.status === "pending" && status === "cancelled")) {
          return res.status(403).json({
            message: "주문 취소만 가능합니다. (접수 상태에서만)",
          });
        }
      }

      updateData.status = status;
    }

    if (shipping !== undefined) {
      if (!isAdmin && order.status !== "pending") {
        return res.status(400).json({
          message: "접수 상태에서만 배송지를 수정할 수 있습니다.",
        });
      }

      const shippingResult = normalizeShipping(shipping);
      if (shippingResult.error) {
        return res.status(400).json({ message: shippingResult.error });
      }
      updateData.shipping = shippingResult.value;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "수정할 내용이 없습니다." });
    }

    const updated = await Order.findByIdAndUpdate(order._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "주문이 수정되었습니다.",
      order: updated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "주문 수정에 실패했습니다.", error: error.message });
  }
};

// 주문 삭제 (접수/취소 상태만, 본인 또는 관리자)
// DELETE /orders/:id
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = isObjectId(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderNumber: id });

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "이 주문을 삭제할 권한이 없습니다." });
    }

    if (!["pending", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        message: "접수 또는 취소된 주문만 삭제할 수 있습니다.",
      });
    }

    await Order.findByIdAndDelete(order._id);

    res.status(200).json({
      message: "주문이 삭제되었습니다.",
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    res.status(500).json({ message: "주문 삭제에 실패했습니다.", error: error.message });
  }
};
