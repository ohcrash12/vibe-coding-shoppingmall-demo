import Product, { CATEGORIES, MAX_IMAGES } from "../models/Product.js";

// size가 문자열로 오면 배열로 변환
const normalizeSize = (size) => {
  if (Array.isArray(size)) {
    return size.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof size === "string" && size.trim()) {
    return size
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

// images[] 또는 구버전 image 문자열 → 최대 4장 URL 배열
const normalizeImages = (images, image) => {
  let list = [];

  if (Array.isArray(images)) {
    list = images.map((item) => String(item).trim()).filter(Boolean);
  } else if (typeof images === "string" && images.trim()) {
    list = [images.trim()];
  } else if (image && String(image).trim()) {
    list = [String(image).trim()];
  }

  return list.slice(0, MAX_IMAGES);
};

// MongoDB _id 또는 productId로 상품 찾기
const findProductByParam = async (id) => {
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    const byObjectId = await Product.findById(id);
    if (byObjectId) return byObjectId;
  }

  return Product.findOne({ productId: id });
};

// 상품 전체 조회
// GET /products?all=true          → 전체 목록 (메인페이지용)
// GET /products?page=1&limit=2    → 페이지네이션 (관리자용, 기본 limit=2)
export const getProducts = async (req, res) => {
  try {
    const wantAll =
      req.query.all === "true" || req.query.all === "1" || req.query.all === "yes";

    if (wantAll) {
      const products = await Product.find().sort({ createdAt: -1 });
      return res.status(200).json({
        products,
        pagination: {
          page: 1,
          limit: products.length,
          total: products.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 2);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "상품 조회에 실패했습니다.", error: error.message });
  }
};

// 상품 상세 조회 (GET /products/:id)
export const getProductById = async (req, res) => {
  try {
    const product = await findProductByParam(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "상품 조회에 실패했습니다.", error: error.message });
  }
};

// 상품 등록 (POST /products)
export const createProduct = async (req, res) => {
  try {
    const { productId, name, price, category, size, image, images, description } = req.body;

    if (!productId || !String(productId).trim()) {
      return res.status(400).json({ message: "상품 ID를 입력해주세요." });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "상품 이름을 입력해주세요." });
    }

    if (price === undefined || price === null || price === "") {
      return res.status(400).json({ message: "상품 가격을 입력해주세요." });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "상품 가격은 0 이상의 숫자여야 합니다." });
    }

    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: "카테고리는 상의, 하의, 악세사리 중 하나여야 합니다.",
      });
    }

    const normalizedSize = normalizeSize(size);
    if (normalizedSize.length === 0) {
      return res.status(400).json({ message: "상품 사이즈를 1개 이상 입력해주세요." });
    }

    const normalizedImages = normalizeImages(images, image);
    if (normalizedImages.length === 0) {
      return res.status(400).json({ message: "상품 이미지를 1장 이상 업로드해주세요." });
    }

    const product = await Product.create({
      productId: String(productId).trim(),
      name: String(name).trim(),
      price: numericPrice,
      category,
      size: normalizedSize,
      images: normalizedImages,
      image: normalizedImages[0],
      description: description ? String(description).trim() : "",
    });

    res.status(201).json({
      message: "상품이 등록되었습니다.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "이미 사용 중인 상품 ID입니다." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "상품 등록에 실패했습니다.", error: error.message });
  }
};

// 상품 수정 (PUT /products/:id)
export const updateProduct = async (req, res) => {
  try {
    const product = await findProductByParam(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const { productId, name, price, category, size, image, images, description } = req.body;
    const updateData = {};

    if (productId !== undefined) {
      if (!String(productId).trim()) {
        return res.status(400).json({ message: "상품 ID를 입력해주세요." });
      }
      updateData.productId = String(productId).trim();
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: "상품 이름을 입력해주세요." });
      }
      updateData.name = String(name).trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: "상품 가격은 0 이상의 숫자여야 합니다." });
      }
      updateData.price = numericPrice;
    }

    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          message: "카테고리는 상의, 하의, 악세사리 중 하나여야 합니다.",
        });
      }
      updateData.category = category;
    }

    if (size !== undefined) {
      const normalizedSize = normalizeSize(size);
      if (normalizedSize.length === 0) {
        return res.status(400).json({ message: "상품 사이즈를 1개 이상 입력해주세요." });
      }
      updateData.size = normalizedSize;
    }

    if (images !== undefined || image !== undefined) {
      const normalizedImages = normalizeImages(images, image);
      if (normalizedImages.length === 0) {
        return res.status(400).json({ message: "상품 이미지를 1장 이상 업로드해주세요." });
      }
      updateData.images = normalizedImages;
      updateData.image = normalizedImages[0];
    }

    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    const updated = await Product.findByIdAndUpdate(product._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      message: "상품이 수정되었습니다.",
      product: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "이미 사용 중인 상품 ID입니다." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "상품 수정에 실패했습니다.", error: error.message });
  }
};

// 상품 삭제 (DELETE /products/:id)
export const deleteProduct = async (req, res) => {
  try {
    const product = await findProductByParam(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      message: "상품이 삭제되었습니다.",
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "상품 삭제에 실패했습니다.", error: error.message });
  }
};
