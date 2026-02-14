const Brand = require("../model/Brand");
const Category = require("../model/Category");
const Product = require("../model/Products");

// Create product service
exports.createProductService = async (data) => {
  try {
    const product = await Product.create(data);
    const { _id: productId, brand, category } = product;

    // Update Brand and Category using batch updates
    await Promise.all([
      Brand.updateOne({ _id: brand.id }, { $push: { products: productId } }),
      Category.updateOne(
        { _id: category.id },
        { $push: { products: productId } }
      ),
    ]);

    return product;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

// Create all product service
exports.addAllProductService = async (data) => {
  try {
    await Product.deleteMany();
    const products = await Product.insertMany(data);

    // Create batch updates for Brand and Category
    const brandUpdates = [];
    const categoryUpdates = [];

    products.forEach((product) => {
      brandUpdates.push({
        updateOne: {
          filter: { _id: product.brand.id },
          update: { $push: { products: product._id } },
        },
      });
      categoryUpdates.push({
        updateOne: {
          filter: { _id: product.category.id },
          update: { $push: { products: product._id } },
        },
      });
    });

    await Promise.all([
      Brand.bulkWrite(brandUpdates),
      Category.bulkWrite(categoryUpdates),
    ]);

    return products;
  } catch (error) {
    console.error("Error adding all products:", error);
    throw error;
  }
};

// Get all products
exports.getAllProductsService = async () => {
  return await Product.find({ status: "in-stock" })
    .populate("reviews")
    .lean()
    .exec();
};

// Get products by type with filtering
exports.getProductTypeService = async (req) => {
  const { type } = req.params;
  const query = req.query;
  let filter = { "productType.name": type, status: "in-stock" };

  if (query.new === "true") {
    return Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("reviews")
      .lean()
      .exec();
  } else if (query.featured === "true") {
    filter.featured = true;
  } else if (query.topSellers === "true") {
    return Product.find(filter)
      .sort({ sellCount: -1 })
      .limit(8)
      .populate("reviews")
      .lean()
      .exec();
  }

  return Product.find(filter).populate("reviews").lean().exec();
};

// Get products by types with pagination
exports.getAllProductsWithTypesService = async (req) => {
  const { type } = req.params;
  const skip = Math.max(parseInt(req.params.skip, 10) || 0, 0);
  const take = Math.min(Math.max(parseInt(req.params.take, 10) || 10, 1), 100);

  const types = Array.isArray(type) ? type : [];
  const query = types.includes("All")
    ? { status: "in-stock" }
    : { "productType.name": { $in: types }, status: "in-stock" };

  return Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(take)
    .populate("reviews")
    .lean()
    .exec();
};

// Get products with dynamic filtering
exports.getProductsWithDynamicFilterService = async (req) => {
  const { skip, take, ...filters } = req.query;
  filters.status = "in-stock";
  const skipNum = Math.max(parseInt(skip, 10) || 0, 0);
  const takeNum = Math.min(Math.max(parseInt(take, 10) || 10, 1), 100);

  return Product.find(filters)
    .sort({ createdAt: -1 })
    .skip(skipNum)
    .limit(takeNum)
    .populate("reviews")
    .lean()
    .exec();
};

// Get offer timer product
exports.getOfferTimerProductService = async (query) => {
  return Product.find({
    "productType.name": query,
    status: "in-stock",
    "offerDate.endDate": { $gt: new Date() },
  })
    .populate("reviews")
    .lean()
    .exec();
};

// Get popular products by type
exports.getPopularProductServiceByType = async (type) => {
  return Product.find({ "productType.name": type, status: "in-stock" })
    .sort({ createdAt: -1 })
    .limit(8)
    .populate("reviews")
    .lean()
    .exec();
};

// Get top-rated products
exports.getTopRatedProductService = async () => {
  // Use aggregation to calculate ratings efficiently
  const products = await Product.aggregate([
    {
      $match: {
        reviews: { $exists: true, $not: { $size: 0 } },
        status: "in-stock",
      },
    },
    {
      $lookup: {
        from: "reviews",
        localField: "reviews",
        foreignField: "_id",
        as: "reviewsData",
      },
    },
    {
      $addFields: {
        averageRating: {
          $avg: "$reviewsData.rating",
        },
        reviewCount: { $size: "$reviewsData" },
      },
    },
    {
      $match: {
        reviewCount: { $gt: 0 },
      },
    },
    {
      $sort: {
        averageRating: -1,
        reviewCount: -1,
      },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        reviewsData: 0, // Remove the temporary field
      },
    },
  ]);

  return products;
};

// Get product by ID
exports.getProductService = async (id) => {
  return Product.findById(id).populate("reviews").exec();
};

// Get related products
exports.getRelatedProductService = async (productId) => {
  const currentProduct = await Product.findById(productId)
    .select("category")
    .lean();

  if (!currentProduct) {
    return [];
  }

  return Product.find({
    "category.name": currentProduct.category.name,
    status: "in-stock",
    _id: { $ne: productId },
  })
    .limit(8)
    .lean()
    .exec();
};

// Update a product
exports.updateProductService = async (id, currProduct) => {
  try {
    const product = await Product.findById(id).populate("category"); // Populate the category

    if (!product) {
      throw new Error("Product not found");
    }

    const oldCategory = product.category; // Store the old category
    Object.assign(product, currProduct);

    if (currProduct.brand) {
      product.brand = {
        id: currProduct.brand.id,
        name: currProduct.brand.name,
      };
    }

    if (currProduct.category) {
      product.category = {
        id: currProduct.category.id,
        name: currProduct.category.name,
      };
    }
    // Save the updated product *before* updating categories
    await product.save();

    // Handle category updates if the category has changed
    if (
      oldCategory &&
      currProduct.category &&
      oldCategory.id !== currProduct.category.id
    ) {
      const newCategory = await Category.findById(currProduct.category.id);
      if (!newCategory) {
        throw new Error("New Category not found");
      }

      // Remove product ID from the old category's products array
      await Category.updateOne(
        { _id: oldCategory._id },
        { $pull: { products: id } }
      );

      // Add product ID to the new category's products array, only if it doesn't already exist
      await Category.updateOne(
        { _id: newCategory._id },
        { $addToSet: { products: id } } // Use $addToSet to prevent duplicates
      );
    }

    return product; // Return the updated product
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

// Get reviewed products
exports.getReviewsProducts = async () => {
  return Product.find({
    reviews: { $exists: true, $not: { $size: 0 } },
    status: "in-stock",
  })
    .populate("reviews")
    .lean()
    .exec();
};

// Get out-of-stock products
exports.getStockOutProducts = async () => {
  return Product.find({ status: "out-of-stock" })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

// Delete a product
exports.deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};
exports.syncProductIdsWithCategoriesService = async () => {
  try {
    const categories = await Category.find({}, { products: 1, parent: 1 }).lean();

    // Fetch ALL existing product IDs in one query instead of checking one by one
    const allProductIds = await Product.find({}, { _id: 1 }).lean();
    const existingProductIds = new Set(allProductIds.map((p) => p._id.toString()));

    // Fetch product IDs grouped by category in a single query
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category.id",
          productIds: { $addToSet: "$_id" },
        },
      },
    ]);

    const categoryToProducts = new Map();
    for (const entry of productsByCategory) {
      categoryToProducts.set(entry._id?.toString(), entry.productIds);
    }

    const bulkOps = [];

    for (const category of categories) {
      const currentProductIds = new Set(
        category.products.map((id) => id.toString())
      );

      // Filter to only products that exist in DB (using the pre-fetched set)
      const validProductIds = new Set();
      for (const productId of currentProductIds) {
        if (existingProductIds.has(productId)) {
          validProductIds.add(productId);
        }
      }

      // Add missing products for this category
      const expectedProducts =
        categoryToProducts.get(category._id.toString()) || [];
      for (const productId of expectedProducts) {
        if (!validProductIds.has(productId.toString())) {
          validProductIds.add(productId.toString());
        }
      }

      const finalProductIds = Array.from(validProductIds);
      if (finalProductIds.length !== category.products.length) {
        bulkOps.push({
          updateOne: {
            filter: { _id: category._id },
            update: { $set: { products: finalProductIds } },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    console.log("Product IDs in all categories synchronized.");
  } catch (error) {
    console.error("Error synchronizing product IDs with categories:", error);
    throw error;
  }
};

exports.clearExpiredDiscountsService = async () => {
  try {
    const expiredProducts = await Product.find({
      discount: { $gt: 0 },
      status: "in-stock",
      "offerDate.endDate": { $lt: new Date() },
    });

    if (expiredProducts.length === 0) {
      console.log("No products with expired discounts.");
      return;
    }

    const updatedProducts = await Product.updateMany(
      { _id: { $in: expiredProducts.map((p) => p._id) } },
      {
        $set: { discount: 0 },
        $unset: { "offerDate.endDate": "" },
      }
    );

    console.log(`products' discounts cleared.`);
  } catch (error) {
    console.error("Error clearing expired discounts:", error);
  }
};

module.exports.updateQuantitiesService = async (updates) => {
  if (!Array.isArray(updates)) {
    throw new Error("Updates should be an array.");
  }

  if (updates.length === 0) {
    console.warn("No updates provided.");
    return;
  }

  // Normalize SKU (trim + uppercase to avoid mismatches)
  const normalizeSku = (sku) =>
    typeof sku === "string" ? sku.trim().toUpperCase() : "";

  // Prepare updates
  const preparedUpdates = updates
    .map((u) => {
      const sku = normalizeSku(u.sku);
      let qty = u.quantity;

      if (!sku) return null;
      if (typeof qty !== "number") {
        const parsed = Number(qty);
        if (Number.isNaN(parsed)) return null;
        qty = parsed;
      }
      return { sku, quantity: qty };
    })
    .filter(Boolean);

  const totalIncoming = preparedUpdates.length;
  console.log(`📥 Incoming items: ${totalIncoming}`);

  // Log all incoming SKUs in batches of 100
  for (let i = 0; i < preparedUpdates.length; i += 100) {
    console.log(
      `📦 Incoming SKUs batch ${Math.floor(i / 100) + 1}:`,
      preparedUpdates
        .slice(i, i + 100)
        .map((u) => u.sku)
        .join(", ")
    );
  }

  // Pre-check DB for existing SKUs
  const existingDocs = await Product.find(
    { sku: { $in: preparedUpdates.map((u) => u.sku) } },
    { sku: 1 }
  ).lean();

  const existingSkus = new Set(existingDocs.map((d) => normalizeSku(d.sku)));
  const notInDb = preparedUpdates
    .map((u) => u.sku)
    .filter((sku) => !existingSkus.has(sku));

  if (notInDb.length > 0) {
    console.warn(`⚠️ ${notInDb.length} SKUs not found in DB.`);
    for (let i = 0; i < notInDb.length; i += 100) {
      console.warn(
        `⚠️ Missing SKUs batch ${Math.floor(i / 100) + 1}:`,
        notInDb.slice(i, i + 100).join(", ")
      );
    }
  }

  // Build update operations only for SKUs found in DB
  const bulkOperations = preparedUpdates
    .filter((u) => existingSkus.has(u.sku))
    .map((update) => ({
      updateOne: {
        filter: { sku: update.sku },
        update: {
          $set: {
            quantity: update.quantity,
            status: update.quantity > 0 ? "in-stock" : "out-of-stock",
          },
        },
        upsert: false,
      },
    }));

  if (bulkOperations.length === 0) {
    console.warn("No valid updates found in DB.");
    return;
  }

  // Run bulkWrite in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < bulkOperations.length; i += chunkSize) {
    const chunk = bulkOperations.slice(i, i + chunkSize);
    await Product.bulkWrite(chunk, { ordered: false });
  }

  console.log(`✅ Updated ${bulkOperations.length} items in DB.`);
};

exports.getFilteredPaginatedProductsService = async (query) => {
  try {
    const {
      skip = 0,
      take = 10,
      brand,
      category,
      productType,
      color,
      search,
      status,
      sortBy,
    } = query;

    const skipNum = Math.max(parseInt(skip, 10) || 0, 0);
    const takeNum = Math.min(Math.max(parseInt(take, 10) || 10, 1), 100);

    // Build match stage
    const matchStage = {};

    if (brand) {
      const brandValue = Array.isArray(brand) ? brand[0] : brand;
      matchStage["brand.name"] = new RegExp(
        `^${brandValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    if (category) {
      const categoryValue = Array.isArray(category) ? category[0] : category;
      matchStage["category.name"] = new RegExp(
        `^${categoryValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    if (productType) {
      const productTypeValue = Array.isArray(productType)
        ? productType[0]
        : productType;
      matchStage["productType.name"] = new RegExp(
        `^${productTypeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    if (color) {
      const colorValue = Array.isArray(color) ? color[0] : color;
      matchStage["color.name"] = new RegExp(
        `^${colorValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
    }
    if (status) {
      matchStage["status"] = status;
    }

    if (search) {
      const searchValue = Array.isArray(search) ? search[0] : search;
      const searchRegex = new RegExp(
        searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      matchStage.$or = [
        { title: searchRegex },
        { "brand.name": searchRegex },
        { "category.name": searchRegex },
        { "color.name": searchRegex },
        { "productType.name": searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { sku: searchRegex },
      ];
    }

    // Build sort stage
    let sortStage;
    if (category) {
      sortStage = {
        "brand.name": 1,
        title: 1,
        _id: 1,
      };
    } else if (sortBy) {
      switch (sortBy.toUpperCase()) {
        case "LTH":
          sortStage = { price: 1, title: 1, _id: 1 };
          break;
        case "HTL":
          sortStage = { price: -1, title: 1, _id: 1 };
          break;
        default:
          sortStage = { createdAt: -1, title: 1, _id: 1 };
      }
    } else {
      sortStage = { createdAt: -1, title: 1, _id: 1 };
    }

    // Use aggregation pipeline with optimized stages
    const pipeline = [
      { $match: matchStage },
      { $sort: sortStage },
      {
        $facet: {
          products: [
            { $skip: skipNum },
            { $limit: takeNum },
            {
              $lookup: {
                from: "reviews",
                localField: "reviews",
                foreignField: "_id",
                as: "reviews",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Product.aggregate(pipeline).allowDiskUse(true);
    const products = result.products || [];
    const totalCount = result.totalCount[0]?.count || 0;

    return {
      products,
      totalCount,
      skip: skipNum,
      take: takeNum,
      totalPages: Math.ceil(totalCount / takeNum),
      hasNextPage: skipNum + takeNum < totalCount,
      hasPrevPage: skipNum > 0,
    };
  } catch (error) {
    console.error("Error in getFilteredPaginatedProductsService:", error);
    throw new Error("Failed to retrieve products.");
  }
};
