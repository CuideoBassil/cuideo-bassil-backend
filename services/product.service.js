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
  return await Product.find({ status: "in-stock" }).populate("reviews");
};

// Get products by type with filtering
exports.getProductTypeService = async (req) => {
  const { type } = req.params;
  const query = req.query;
  let filter = { productType: type, status: "in-stock" };

  if (query.new === "true") {
    return Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("reviews");
  } else if (query.featured === "true") {
    filter.featured = true;
  } else if (query.topSellers === "true") {
    return Product.find(filter)
      .sort({ sellCount: -1 })
      .limit(8)
      .populate("reviews");
  }

  return Product.find(filter).populate("reviews");
};

// Get products by types with pagination
exports.getAllProductsWithTypesService = async (req) => {
  const { type } = req.params;
  // let types = req.params.type ? req.params.type.split(",") : [];
  const skip = parseInt(req.params.skip, 10) || 0;
  const take = parseInt(req.params.take, 10) || 10;

  const types = Array.isArray(type) ? type : [];
  const query = types.includes("All")
    ? { status: "in-stock" }
    : { productType: { name: { $in: types } }, status: "in-stock" };

  return Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip >= 0 ? skip : 0)
    .limit(take >= 0 ? take : 10)
    .populate("reviews");
};

// Get products with dynamic filtering
exports.getProductsWithDynamicFilterService = async (req) => {
  const { skip, take, ...filters } = req.query;
  filters.status = "in-stock";
  return Product.find(filters)
    .sort({ createdAt: -1 })
    .skip(parseInt(skip, 10) || 0)
    .limit(parseInt(take, 10) || 10)
    .populate("reviews");
};

// Get offer timer product
exports.getOfferTimerProductService = async (query) => {
  return Product.find({
    productType: query,
    status: "in-stock",
    "offerDate.endDate": { $gt: new Date() },
  }).populate("reviews");
};

// Get popular products by type
exports.getPopularProductServiceByType = async (type) => {
  return Product.find({ productType: type, status: "in-stock" })
    .sort({ "reviews.length": -1 })
    .limit(8)
    .populate("reviews");
};

// Get top-rated products
exports.getTopRatedProductService = async () => {
  const products = await Product.find({
    reviews: { $exists: true, $ne: [] },
    status: "in-stock",
  }).populate("reviews");

  const topRatedProducts = products.map((product) => {
    const totalRating = product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / product.reviews.length;

    return {
      ...product.toObject(),
      rating: averageRating,
    };
  });

  topRatedProducts.sort((a, b) => b.rating - a.rating);

  return topRatedProducts;
};

// Get product by ID
exports.getProductService = async (id) => {
  return Product.findOne({ _id: id, status: "in-stock" }).populate("reviews");
};

// Get related products
exports.getRelatedProductService = async (productId) => {
  const currentProduct = await Product.findById(productId);
  return Product.find({
    "category.name": currentProduct.category.name,
    status: "in-stock",
    _id: { $ne: productId },
  });
};

// Update a product
exports.updateProductService = async (id, currProduct) => {
  const product = await Product.findById(id);
  if (!product) throw new Error("Product not found");

  Object.assign(product, currProduct);

  if (currProduct.brand) {
    product.brand = { id: currProduct.brand.id, name: currProduct.brand.name };
  }
  if (currProduct.category) {
    product.category = {
      id: currProduct.category.id,
      name: currProduct.category.name,
    };
  }

  return await product.save();
};

// Get reviewed products
exports.getReviewsProducts = async () => {
  const products = await Product.find({
    reviews: { $exists: true },
    status: "in-stock",
  }).populate("reviews");
  console.log("products", products);
  // Filter out products where reviews array is empty
  const filteredProducts = products.filter(
    (product) => product.reviews.length > 0
  );
  console.log("filteredProducts", filteredProducts);

  return filteredProducts;
};

exports.getReviewsProducts = async () => {
  return Product.find({
    reviews: { $exists: true, $ne: [] },
    status: "in-stock",
  }).populate("reviews");
};

// Get out-of-stock products
exports.getStockOutProducts = async () => {
  return Product.find({ status: "out-of-stock" }).sort({ createdAt: -1 });
};

// Delete a product
exports.deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
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
  for (const update of updates) {
    if (
      update.sku == "PFI75TNXG" ||
      update.sku == "WW70T4020CX1AS" ||
      update.sku == "FFB8259SBS"
    ) {
      console.log(`SKU: ${update.sku}, Quantity: ${update.quantity}`);
    }
  }
  console.log("number of updates", updates.length);

  if (updates.length === 0) {
    console.warn("No updates provided.");
    return;
  }

  const bulkOperations = updates
    .filter((update) => update.sku && typeof update.quantity === "number")
    .map((update) => ({
      updateOne: {
        filter: { sku: update.sku },
        update: {
          $set: {
            quantity: update.quantity,
            status: update.quantity > 0 ? "in-stock" : "out-of-stock",
          },
        },
      },
    }));

  if (bulkOperations.length === 0) {
    console.warn("No valid updates found.");
    return;
  }

  await Product.bulkWrite(bulkOperations);
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

    const filter = {};
    const sortOptions = {};

    // Individual filters
    if (brand) {
      filter["brand.name"] = { $regex: new RegExp(brand, "i") };
    }
    if (category) {
      filter["category.name"] = { $regex: new RegExp(category, "i") };
    }
    if (productType) {
      filter["productType.name"] = { $regex: new RegExp(productType, "i") };
    }
    if (color) {
      filter["color.name"] = { $regex: new RegExp(color, "i") };
    }
    if (status) {
      filter["status"] = status;
    }

    // Global search across multiple text fields (excluding price and discount)
    if (search) {
      filter.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { "brand.name": { $regex: new RegExp(search, "i") } },
        { "category.name": { $regex: new RegExp(search, "i") } },
        { "color.name": { $regex: new RegExp(search, "i") } },
        { "color.code": { $regex: new RegExp(search, "i") } },
        { "productType.name": { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
        { additionalInformation: { $regex: new RegExp(search, "i") } },
        { tags: { $regex: new RegExp(search, "i") } },
        { sku: { $regex: new RegExp(search, "i") } },
        { unit: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Determine the sorting options
    if (sortBy) {
      switch (sortBy.toUpperCase()) {
        case "LTH":
          sortOptions.price = 1;
          break;
        case "HTL":
          sortOptions.price = -1;
          break;
        default:
          sortOptions.createdAt = -1;
      }
    } else {
      sortOptions.createdAt = -1;
    }

    // Fetch the products with pagination and sorting
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(parseInt(skip, 10))
      .limit(parseInt(take, 10))
      .populate("reviews");

    // Count the total number of products matching filters
    const totalCount = await Product.countDocuments(filter);

    return {
      products,
      totalCount,
    };
  } catch (error) {
    console.error("Error in getFilteredPaginatedProductsService:", error);
    throw new Error("Failed to retrieve products.");
  }
};
// exports.getFilteredPaginatedProductsService = async (query) => {
//   try {
//     const {
//       skip = 0,
//       take = 10,
//       brand,
//       category,
//       productType,
//       color,
//       search,
//       status,
//       sortBy,
//     } = query;

//     const filter = {};
//     const sortOptions = {};

//     // Text-based filters (case-insensitive)
//     if (brand) {
//       filter["brand.name"] = { $regex: new RegExp(brand, "i") };
//     }
//     if (category) {
//       filter["category.name"] = { $regex: new RegExp(category, "i") };
//     }
//     if (productType) {
//       filter["productType.name"] = { $regex: new RegExp(productType, "i") };
//     }
//     if (color) {
//       filter["color.name"] = { $regex: new RegExp(color, "i") };
//     }
//     if (search) {
//       filter["title"] = { $regex: new RegExp(search, "i") };
//     }
//     if (status) {
//       filter["status"] = status;
//     }

//     // Determine the sorting options
//     if (sortBy) {
//       switch (sortBy.toUpperCase()) {
//         case "LTH":
//           sortOptions.price = 1;
//           break;
//         case "HTL":
//           sortOptions.price = -1;
//           break;
//         default:
//           sortOptions.createdAt = -1;
//       }
//     } else {
//       sortOptions.createdAt = -1; // This line is now necessary to handle the case where sortBy is not provided
//     }

//     // Fetch the products with pagination and sorting
//     const products = await Product.find(filter)
//       .sort(sortOptions)
//       .skip(parseInt(skip, 10))
//       .limit(parseInt(take, 10))
//       .populate("reviews"); // Assuming you have a reviews relation

//     // Count the total number of products matching filters
//     const totalCount = await Product.countDocuments(filter);

//     return {
//       products,
//       totalCount,
//     };
//   } catch (error) {
//     console.error("Error in getFilteredPaginatedProductsService:", error);
//     throw new Error("Failed to retrieve products."); // Or handle the error as needed
//   }
// };
