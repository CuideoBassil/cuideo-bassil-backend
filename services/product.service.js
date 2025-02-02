const Brand = require("../model/Brand");
const Category = require("../model/Category");
const Product = require("../model/Products");

// create product service
exports.createProductService = async (data) => {
  const product = await Product.create(data);
  const { _id: productId, brand, category } = product;
  //update Brand
  await Brand.updateOne({ _id: brand.id }, { $push: { products: productId } });
  //Category Brand
  await Category.updateOne(
    { _id: category.id },
    { $push: { products: productId } }
  );
  return product;
};

// create all product service
exports.addAllProductService = async (data) => {
  await Product.deleteMany();
  const products = await Product.insertMany(data);
  for (const product of products) {
    await Brand.findByIdAndUpdate(product.brand.id, {
      $push: { products: product._id },
    });
    await Category.findByIdAndUpdate(product.category.id, {
      $push: { products: product._id },
    });
  }
  return products;
};

// get product data
exports.getAllProductsService = async () => {
  const products = await Product.find({}).populate("reviews");
  return products;
};

// get type of product service
exports.getProductTypeService = async (req) => {
  const type = req.params.type;
  const query = req.query;
  let products;
  if (query.new === "true") {
    products = await Product.find({ productType: type })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("reviews");
  } else if (query.featured === "true") {
    products = await Product.find({
      productType: type,
      featured: true,
    }).populate("reviews");
  } else if (query.topSellers === "true") {
    products = await Product.find({ productType: type })
      .sort({ sellCount: -1 })
      .limit(8)
      .populate("reviews");
  } else {
    products = await Product.find({ productType: type }).populate("reviews");
  }
  return products;
};

// Get product type service
exports.getAllProductsWithTypesService = async (req) => {
  const types = req.params.type || [];
  const skip = parseInt(req.params.skip, 10) || 0;
  const take = parseInt(req.params.take, 10) || 10;

  console.log("types: ", types, "skip: ", skip, "take: ", take);

  let query = {}; // Initialize an empty query

  // Construct the query based on types
  if (Array.isArray(types) && types.length > 0) {
    if (types.length === 1 && types[0].toLowerCase() === "all") {
      query = {}; // Return all products if "all" is specified
    } else {
      query = { productType: { $in: types } }; // Filter products by provided types
    }
  }

  let products;

  if (skip === -1 && take === -1) {
    // Return all products without pagination
    products = await Product.find(query)
      .sort({ createdAt: -1 })
      .populate("reviews");
  } else {
    // Apply pagination with skip and take
    products = await Product.find(query)
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order
      .skip(skip)
      .limit(take)
      .populate("reviews");
  }

  return products;
};
// get products with dynamic filtering
exports.getProductsWithDynamicFilterService = async (req) => {
  const { skip, take } = req.params;
  const query = req.query;

  const filter = {}; // Initialize an empty filter object

  // Loop through the query parameters and apply them to the filter dynamically
  for (const key in query) {
    if (query.hasOwnProperty(key)) {
      // Skip fields like "skip" and "take" as they are related to pagination
      if (key === "skip" || key === "take") continue;

      // If the field exists in the Product model, add it to the filter
      // Assuming that the key from query directly corresponds to fields in the Product schema
      filter[key] = query[key];
    }
  }

  let products;

  // Apply pagination if skip and take are not -1, otherwise return all products
  if (skip === "-1" && take === "-1") {
    // Return all products without pagination
    products = await Product.find(filter)
      .sort({ createdAt: -1 }) // Sort by creation date (default to newest)
      .populate("reviews");
  } else {
    // Return products with pagination
    products = await Product.find(filter)
      .skip(parseInt(skip, 10)) // Skip for pagination
      .limit(parseInt(take, 10)) // Take for pagination
      .sort({ createdAt: -1 }) // Sort by creation date (default to newest)
      .populate("reviews");
  }

  return products;
};

// get offer product service
exports.getOfferTimerProductService = async (query) => {
  const products = await Product.find({
    productType: query,
    "offerDate.endDate": { $gt: new Date() },
  }).populate("reviews");
  return products;
};

// get popular product service by type
exports.getPopularProductServiceByType = async (type) => {
  const products = await Product.find({ productType: type })
    .sort({ "reviews.length": -1 })
    .limit(8)
    .populate("reviews");
  return products;
};

exports.getTopRatedProductService = async () => {
  const products = await Product.find({
    reviews: { $exists: true, $ne: [] },
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

// get product data
exports.getProductService = async (id) => {
  const product = await Product.findById(id).populate({
    path: "reviews",
    // populate: { path: "userId", select: "name email imageURL" },
  });
  return product;
};

// get product data
exports.getRelatedProductService = async (productId) => {
  const currentProduct = await Product.findById(productId);

  const relatedProducts = await Product.find({
    "category.name": currentProduct.category.name,
    _id: { $ne: productId }, // Exclude the current product ID
  });
  return relatedProducts;
};

// update a product
exports.updateProductService = async (id, currProduct) => {
  const product = await Product.findById(id);
  if (product) {
    product.title = currProduct.title;
    product.brand.name = currProduct.brand.name;
    product.brand.id = currProduct.brand.id;
    product.category.name = currProduct.category.name;
    product.category.id = currProduct.category.id;
    product.sku = currProduct.sku;
    product.img = currProduct.img;
    product.slug = currProduct.slug;
    product.unit = currProduct.unit;
    product.imageURLs = currProduct.imageURLs;
    product.tags = currProduct.tags;
    product.parent = currProduct.parent;
    product.children = currProduct.children;
    product.price = currProduct.price;
    product.discount = currProduct.discount;
    product.quantity = currProduct.quantity;
    product.status = currProduct.status;
    product.productType = currProduct.productType;
    product.description = currProduct.description;
    product.additionalInformation = currProduct.additionalInformation;
    product.offerDate.startDate = currProduct.offerDate.startDate;
    product.offerDate.endDate = currProduct.offerDate.endDate;

    await product.save();
  }

  return product;
};

// get Reviews Products
exports.getReviewsProducts = async () => {
  const result = await Product.find({
    reviews: { $exists: true, $ne: [] },
  }).populate({
    path: "reviews",
    // populate: { path: "userId", select: "name email imageURL" },
  });

  const products = result.filter((p) => p.reviews.length > 0);

  return products;
};

// get Reviews Products
exports.getStockOutProducts = async () => {
  const result = await Product.find({ status: "out-of-stock" }).sort({
    createdAt: -1,
  });
  return result;
};

// get Reviews Products
exports.deleteProduct = async (id) => {
  const result = await Product.findByIdAndDelete(id);
  return result;
};

// update products quatities
module.exports.updateQuantitiesService = async (updates) => {
  for (const update of updates) {
    if (!update.sku || typeof update.quantity !== "number") {
      throw new Error("Each object must contain sku and quantity.");
    }
    const product = await Product.findOne({ sku: update.sku });
    if (product) {
      await Product.updateOne(
        { _id: product.id },
        {
          $set: {
            quantity: update.quantity,
            status: update.quantity > 0 ? "in-stock" : "out-of-stock",
          },
        }
      );
    }
  }
};
