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
  return await Product.find({}).populate("reviews");
};

// Get products by type with filtering
exports.getProductTypeService = async (req) => {
  const { type } = req.params;
  const query = req.query;
  let filter = { productType: type };

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
    ? {}
    : { productType: { name: { $in: types } } };

  return Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip >= 0 ? skip : 0)
    .limit(take >= 0 ? take : 10)
    .populate("reviews");
};

// Get products with dynamic filtering
exports.getProductsWithDynamicFilterService = async (req) => {
  const { skip, take, ...filters } = req.query;
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
    "offerDate.endDate": { $gt: new Date() },
  }).populate("reviews");
};

// Get popular products by type
exports.getPopularProductServiceByType = async (type) => {
  return Product.find({ productType: type })
    .sort({ "reviews.length": -1 })
    .limit(8)
    .populate("reviews");
};

// Get top-rated products
exports.getTopRatedProductService = async () => {
  const products = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate("reviews");

  return products
    .map((product) => ({
      ...product.toObject(),
      rating:
        product.reviews.reduce((sum, r) => sum + r.rating, 0) /
        product.reviews.length,
    }))
    .sort((a, b) => b.rating - a.rating);
};

// Get product by ID
exports.getProductService = async (id) => {
  return Product.findById(id).populate("reviews");
};

// Get related products
exports.getRelatedProductService = async (productId) => {
  const currentProduct = await Product.findById(productId);
  return Product.find({
    "category.name": currentProduct.category.name,
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
  return Product.find({ reviews: { $exists: true, $ne: [] } }).populate(
    "reviews"
  );
};

// Get out-of-stock products
exports.getStockOutProducts = async () => {
  return Product.find({ status: "out-of-stock" }).sort({ createdAt: -1 });
};

// Delete a product
exports.deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};

// Update product quantities
exports.updateQuantitiesService = async (updates) => {
  if (!Array.isArray(updates)) throw new Error("Updates should be an array");

  const bulkUpdates = updates.map((update) => {
    if (!update.sku || typeof update.quantity !== "number") {
      throw new Error("Each update must have a valid sku and quantity");
    }
    return {
      updateOne: {
        filter: { sku: update.sku },
        update: {
          $set: {
            quantity: update.quantity,
            status: update.quantity > 0 ? "in-stock" : "out-of-stock",
          },
        },
      },
    };
  });

  return Product.bulkWrite(bulkUpdates);
};

// update products quatities
// module.exports.updateQuantitiesService = async (updates) => {
//   for (const update of updates) {
//     if (!update.sku || typeof update.quantity !== "number") {
//       throw new Error("Each object must contain sku and quantity.");
//     }
//     const product = await Product.findOne({ sku: update.sku });
//     if (product) {
//       await Product.updateOne(
//         { _id: product.id },
//         {
//           $set: {
//             quantity: update.quantity,
//             status: update.quantity > 0 ? "in-stock" : "out-of-stock",
//           },
//         }
//       );
//     }
//   }
// };
