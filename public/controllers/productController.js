const Product = require('../models/Product');

const httpError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// GET /api/products?category=&supplier=&search=&minPrice=&maxPrice=&sort=&page=&limit=
exports.getProducts = async (req, res, next) => {
  try {
    const { category, supplier, search, minPrice, maxPrice, sort } = req.query;
    const filter = {};

    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (supplier) filter.supplier = new RegExp(`^${escapeRegex(supplier)}$`, 'i');
    if (search) filter.name = new RegExp(escapeRegex(search), 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // sort=price:desc,name:asc  OR  sort=-price,name
    let sortBy = { createdAt: -1 };
    if (sort) {
      sortBy = {};
      sort.split(',').forEach((s) => {
        if (s.includes(':')) {
          const [field, dir] = s.split(':');
          sortBy[field] = dir === 'desc' ? -1 : 1;
        } else if (s.startsWith('-')) {
          sortBy[s.slice(1)] = -1;
        } else {
          sortBy[s] = 1;
        }
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
    ]);

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError('Product not found', 404);
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) throw httpError('Product not found', 404);
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/stock   body: { "change": 10 } or { "change": -5 }
exports.adjustStock = async (req, res, next) => {
  try {
    const change = Number(req.body.change);
    if (!Number.isInteger(change) || change === 0) {
      throw httpError('"change" must be a non-zero integer (positive = restock, negative = sale)', 400);
    }

    // Atomic: only applies if resulting quantity won't go below 0
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: change < 0 ? -change : 0 } },
      { $inc: { quantity: change } },
      { new: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) throw httpError('Product not found', 404);
      throw httpError('Insufficient stock for this sale', 400);
    }

    res.json({ message: 'Stock updated', product });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw httpError('Product not found', 404);
    res.json({ message: 'Product deleted', id: product._id });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock  (quantity <= reorderLevel)
exports.getLowStock = async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    }).sort({ quantity: 1 });

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/summary  (aggregation by category)
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { totalStockValue: -1 } },
    ]);

    res.json({ categories: summary.length, summary });
  } catch (err) {
    next(err);
  }
};
