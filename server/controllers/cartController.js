import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// MongoDB _id 또는 productId로 상품 찾기
const findProductByParam = async (id) => {
  if (!id) return null;

  const key = String(id).trim();

  if (/^[0-9a-fA-F]{24}$/.test(key)) {
    const byObjectId = await Product.findById(key);
    if (byObjectId) return byObjectId;
  }

  return Product.findOne({ productId: key });
};

// 로그인한 유저의 장바구니 가져오기 (없으면 빈 장바구니 생성)
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

const normalizeQuantity = (value, fallback = 1) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return n;
};

// 내 장바구니 조회 (GET /carts)
export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    res.status(200).json({
      cart,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    });
  } catch (error) {
    res.status(500).json({ message: "장바구니 조회에 실패했습니다.", error: error.message });
  }
};

// 장바구니에 상품 담기 (POST /carts/items)
// body: { productId 또는 product, size, quantity? }
export const addCartItem = async (req, res) => {
  try {
    const productKey = req.body.productId || req.body.product;
    const size = String(req.body.size || "").trim();
    const quantity = normalizeQuantity(req.body.quantity, 1);

    if (!productKey) {
      return res.status(400).json({ message: "상품 ID를 입력해주세요." });
    }

    if (!size) {
      return res.status(400).json({ message: "사이즈를 선택해주세요." });
    }

    const product = await findProductByParam(productKey);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const cart = await getOrCreateCart(req.user.id);

    // 같은 상품 + 같은 사이즈면 수량만 증가
    const existing = cart.items.find(
      (item) =>
        String(item.product) === String(product._id) &&
        String(item.size).toUpperCase() === size.toUpperCase()
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        productId: product.productId,
        name: product.name,
        price: product.price,
        image: product.image,
        size,
        quantity,
      });
    }

    await cart.save();

    res.status(201).json({
      message: "장바구니에 담았습니다.",
      cart,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    });
  } catch (error) {
    res.status(500).json({ message: "장바구니 담기에 실패했습니다.", error: error.message });
  }
};

// 장바구니 상품 수량 수정 (PUT /carts/items/:itemId)
// body: { quantity }
export const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const quantity = normalizeQuantity(req.body.quantity, 0);

    if (quantity < 1) {
      return res.status(400).json({ message: "수량은 1 이상이어야 합니다." });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    item.quantity = quantity;
    await cart.save();

    res.status(200).json({
      message: "수량을 변경했습니다.",
      cart,
      itemCount: cart.items.reduce((sum, row) => sum + row.quantity, 0),
      totalPrice: cart.items.reduce((sum, row) => sum + row.price * row.quantity, 0),
    });
  } catch (error) {
    res.status(500).json({ message: "장바구니 수정에 실패했습니다.", error: error.message });
  }
};

// 장바구니 상품 1개 삭제 (DELETE /carts/items/:itemId)
export const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    item.deleteOne();
    await cart.save();

    res.status(200).json({
      message: "장바구니에서 삭제했습니다.",
      cart,
      itemCount: cart.items.reduce((sum, row) => sum + row.quantity, 0),
      totalPrice: cart.items.reduce((sum, row) => sum + row.price * row.quantity, 0),
    });
  } catch (error) {
    res.status(500).json({ message: "장바구니 삭제에 실패했습니다.", error: error.message });
  }
};

// 장바구니 비우기 (DELETE /carts)
export const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.status(200).json({
      message: "장바구니를 비웠습니다.",
      cart,
      itemCount: 0,
      totalPrice: 0,
    });
  } catch (error) {
    res.status(500).json({ message: "장바구니 비우기에 실패했습니다.", error: error.message });
  }
};
