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
  return Product.findOne({ _id: id }).populate("reviews");
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
  const products = await Product.find({
    reviews: { $exists: true },
    status: "in-stock",
  }).populate("reviews");
  // Filter out products where reviews array is empty
  const filteredProducts = products.filter(
    (product) => product.reviews.length > 0
  );

  return filteredProducts;
};

// Get out-of-stock products
exports.getStockOutProducts = async () => {
  return Product.find({ status: "out-of-stock" }).sort({ createdAt: -1 });
};

// Delete a product
exports.deleteProduct = async (id) => {
  return Product.findByIdAndDelete(id);
};
exports.syncProductIdsWithCategoriesService = async () => {
  try {
    // Fetch all categories without populating (we only need product IDs here)
    const categories = await Category.find({}, { products: 1, parent: 1 });

    // Fetch product IDs grouped by category in a single query
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: "$category.id", // group by category ID
          productIds: { $addToSet: "$_id" }, // collect product IDs
        },
      },
    ]);

    // Convert aggregation result to a map
    const categoryToProducts = new Map();
    for (const entry of productsByCategory) {
      categoryToProducts.set(entry._id?.toString(), entry.productIds);
    }

    // Process each category
    for (const category of categories) {
      const currentProductIds = new Set(
        category.products.map((id) => id.toString())
      );
      const validProductIds = new Set();
      const productsToRemove = [];
      const productsToAdd = [];

      // Keep only valid products (exist in DB)
      for (const productId of currentProductIds) {
        if (await Product.exists({ _id: productId })) {
          validProductIds.add(productId);
        } else {
          productsToRemove.push(productId);
        }
      }

      // Add missing products for this category
      const expectedProducts =
        categoryToProducts.get(category._id.toString()) || [];
      for (const productId of expectedProducts) {
        if (!validProductIds.has(productId.toString())) {
          validProductIds.add(productId.toString());
          productsToAdd.push(productId);
        }
      }

      // Update only if something changed
      const finalProductIds = Array.from(validProductIds);
      if (
        productsToAdd.length > 0 ||
        productsToRemove.length > 0 ||
        finalProductIds.length !== category.products.length
      ) {
        await Category.updateOne(
          { _id: category._id },
          { $set: { products: finalProductIds } }
        );
      }

      // Logging
      if (productsToAdd.length > 0 && productsToRemove.length > 0) {
        console.log(
          `Category ${category.parent} updated. Added: ${productsToAdd.length}, removed: ${productsToRemove.length}, total: ${finalProductIds.length}`
        );
      } else if (productsToAdd.length > 0) {
        console.log(
          `Category ${category.parent} updated. Added: ${productsToAdd.length}, total: ${finalProductIds.length}`
        );
      } else if (productsToRemove.length > 0) {
        console.log(
          `Category ${category.parent} updated. Removed: ${productsToRemove.length}, total: ${finalProductIds.length}`
        );
      }
    }

    console.log("✅ Product IDs in all categories synchronized.");
  } catch (error) {
    console.error("❌ Error synchronizing product IDs with categories:", error);
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

// Optimized updateQuantitiesService
// module.exports.updateQuantitiesService = async (
//   updates,
//   { chunkSize = 100, allowUpsert = false } = {}
// ) => {
//   if (!Array.isArray(updates)) {
//     throw new Error("Updates should be an array.");
//   }
//   if (updates.length === 0) {
//     console.warn("No updates provided.");
//     return {
//       received: 0,
//       deduped: 0,
//       existing: 0,
//       updated: 0,
//       missing: 0,
//       failed: 0,
//       missingSkus: [],
//       failedSkus: [],
//     };
//   }

//   // 1) Normalize and validate input, keep index for debugging
//   const normalized = updates
//     .map((u, idx) => {
//       const skuRaw = (u && (u.sku ?? u.SKU ?? u.Sku)) || "";
//       const sku =
//         typeof skuRaw === "string" ? skuRaw.trim().toUpperCase() : undefined;
//       const quantity =
//         typeof u.quantity === "number" ? u.quantity : Number(u.quantity) || NaN;
//       return { origIndex: idx, raw: u, sku, quantity };
//     })
//     .filter((u) => u.sku && Number.isFinite(u.quantity));

//   // 2) Deduplicate by SKU (last wins)
//   const map = new Map();
//   for (const u of normalized) map.set(u.sku, u);
//   const deduped = Array.from(map.values());

//   // 3) Optional: log special SKUs (using normalized comparison)
//   const specialSkus = ["MSF24", "AC13INV/G", "FFB8259SBS", "LED32HHL"].map(
//     (s) => s.trim().toUpperCase()
//   );
//   const foundSpecials = deduped.filter((u) => specialSkus.includes(u.sku));
//   if (foundSpecials.length > 0) {
//     console.log(
//       "🚨 Special SKUs detected in update payload:",
//       foundSpecials.map((s) => ({ sku: s.sku, quantity: s.quantity }))
//     );
//   }

//   // 4) Pre-query DB to know which SKUs exist
//   const allSkus = deduped.map((d) => d.sku);
//   // Using Product.find + distinct is efficient and tells which SKUs are present
//   const existingSkus = await Product.find({ sku: { $in: allSkus } }).distinct(
//     "sku"
//   );
//   const existingSet = new Set(
//     existingSkus.map((s) => String(s).trim().toUpperCase())
//   );

//   const toUpdate = deduped.filter((d) => existingSet.has(d.sku));
//   const missing = deduped.filter((d) => !existingSet.has(d.sku));
//   const missingSkus = missing.map((m) => m.sku);

//   // If you want to upsert missing SKUs instead of skipping, you can set allowUpsert=true.
//   // We'll build two categories: updatesForExisting, updatesForUpsert
//   const updatesForExisting = toUpdate;
//   const updatesForUpsert = allowUpsert ? missing : [];

//   // 5) Build bulk operations (for existing and possibly upserts)
//   const buildOp = (u, upsert = false) => ({
//     updateOne: {
//       filter: { sku: u.sku },
//       update: {
//         $set: {
//           quantity: u.quantity,
//           status: u.quantity > 0 ? "in-stock" : "out-of-stock",
//         },
//       },
//       upsert,
//     },
//   });

//   const ops = [
//     ...updatesForExisting.map((u) => buildOp(u, false)),
//     ...updatesForUpsert.map((u) => buildOp(u, true)),
//   ];

//   if (ops.length === 0) {
//     console.warn(
//       "No valid updates to apply (either no valid input or none of the SKUs exist)."
//     );
//     return {
//       received: updates.length,
//       deduped: deduped.length,
//       existing: existingSkus.length,
//       updated: 0,
//       missing: missingSkus.length,
//       missingSkus,
//       failed: 0,
//       failedSkus: [],
//     };
//   }

//   // 6) Execute in chunks with detailed logging
//   let totalMatched = 0;
//   let totalModified = 0;
//   let totalUpserted = 0;
//   let totalFailed = 0;
//   const failedSkus = [];

//   for (let i = 0; i < ops.length; i += chunkSize) {
//     const chunk = ops.slice(i, i + chunkSize);
//     const chunkSkus = chunk.map((op) => op.updateOne.filter.sku);
//     console.log(`📦 All SKUs in this chunk: ${chunkSkus.join(", ")}`);

//     try {
//       const result = await Product.bulkWrite(chunk, { ordered: false });

//       // normalize variations in result fields across driver versions
//       const matched = result.matchedCount ?? result.nMatched ?? 0;
//       const modified = result.modifiedCount ?? result.nModified ?? 0;
//       const upserted = result.upsertedCount ?? 0;

//       totalMatched += matched;
//       totalModified += modified;
//       totalUpserted += upserted;

//       // Log what we can
//       console.log(
//         `✅ Chunk ${
//           Math.floor(i / chunkSize) + 1
//         }: matched ${matched}, updated ${modified}, upserted ${upserted}`
//       );

//       // If the result contains writeErrors in any driver, try to capture:
//       if (result.writeErrors && result.writeErrors.length > 0) {
//         totalFailed += result.writeErrors.length;
//         result.writeErrors.forEach((we) => {
//           // best effort: collect the operation index / opcode if present
//           const idx = we.index;
//           const sku = chunk[idx]?.updateOne?.filter?.sku;
//           if (sku) failedSkus.push(sku);
//           console.error(
//             `❌ writeError for SKU ${sku ?? "(unknown)"}:`,
//             we.errmsg || we.toString()
//           );
//         });
//       }
//     } catch (err) {
//       // A chunk-level failure — log and mark all SKUs in chunk as failed
//       totalFailed += chunk.length;
//       failedSkus.push(...chunkSkus);
//       console.error(
//         `❌ Chunk ${Math.floor(i / chunkSize) + 1} failed. ${
//           chunk.length
//         } updates skipped. SKUs: ${chunkSkus.join(", ")}`,
//         err && err.message ? err.message : err
//       );
//       // continue processing next chunks
//     }
//   }

//   // Summary logs and return object
//   console.log(`Processed ${ops.length} bulk operations total.`);
//   if (missingSkus.length > 0) {
//     console.warn(
//       `⚠️ ${
//         missingSkus.length
//       } SKUs not found in DB (skipped unless allowUpsert=true): ${missingSkus.join(
//         ", "
//       )}`
//     );
//   }
//   if (totalFailed > 0) {
//     console.warn(
//       `⚠️ ${totalFailed} updates failed. Affected SKUs: ${failedSkus.join(
//         ", "
//       )}`
//     );
//   }

//   return {
//     received: updates.length,
//     deduped: deduped.length,
//     existing: existingSkus.length,
//     operations: ops.length,
//     matched: totalMatched,
//     modified: totalModified,
//     upserted: totalUpserted,
//     missing: missingSkus.length,
//     missingSkus,
//     failed: totalFailed,
//     failedSkus,
//   };
// };

// module.exports.updateQuantitiesService = async (updates) => {
//   if (!Array.isArray(updates)) {
//     throw new Error("Updates should be an array.");
//   }

//   if (updates.length === 0) {
//     console.warn("No updates provided.");
//     return;
//   }

//   console.log(`📥 Total updates received: ${updates.length}`);

//   // Check for specific SKUs in incoming updates
//   const specialSkus = ["MSF24", "AC13INV/G", "FFB8259SBS", "LED32HHL"];
//   const foundSpecials = updates.filter((u) => specialSkus.includes(u.sku));

//   if (foundSpecials.length > 0) {
//     console.log("🚨 Special SKUs detected in update payload:", foundSpecials.map(s => `${s.sku}(qty:${s.quantity})`));
//   } else {
//     console.log("❌ No special SKUs found in incoming updates");
//   }

//   const latestUpdates = updates.reduce((map, update) => {
//     if (update.sku && typeof update.quantity === "number") {
//       map.set(update.sku, update);
//     }
//     return map;
//   }, new Map());

//   console.log(`🔄 After deduplication: ${latestUpdates.size} unique updates`);

//   // Check if special SKUs survived deduplication
//   const survivedSpecials = Array.from(latestUpdates.keys()).filter(sku => specialSkus.includes(sku));
//   if (survivedSpecials.length > 0) {
//     console.log("✅ Special SKUs after deduplication:", survivedSpecials);
//   } else {
//     console.log("❌ No special SKUs found after deduplication");
//   }

//   const bulkOperations = Array.from(latestUpdates.values()).map((update) => ({
//     updateOne: {
//       filter: { sku: update.sku },
//       update: {
//         $set: {
//           quantity: update.quantity,
//           status: update.quantity > 0 ? "in-stock" : "out-of-stock",
//         },
//       },
//       upsert: false,
//     },
//   }));

//   if (bulkOperations.length === 0) {
//     console.warn("No valid updates found.");
//     return;
//   }

//   // Break into smaller chunks to avoid Mongo write lock issues
//   const chunkSize = 100; // tweak based on DB performance
//   let totalProcessed = 0;
//   let totalFailed = 0;
//   const failedSkus = [];

//   for (let i = 0; i < bulkOperations.length; i += chunkSize) {
//     const chunk = bulkOperations.slice(i, i + chunkSize);
//     const chunkSkus = chunk.map((op) => op.updateOne.filter.sku);

//     // Check if any special SKUs are in this chunk
//     const specialsInChunk = chunkSkus.filter(sku => specialSkus.includes(sku));

//     if (specialsInChunk.length > 0) {
//       console.log(`🚨 CHUNK ${Math.floor(i / chunkSize) + 1} contains special SKUs: ${specialsInChunk.join(", ")}`);
//       console.log(`📦 All SKUs in this chunk: ${chunkSkus.join(", ")}`);
//     } else {
//       console.log(`📦 Chunk ${Math.floor(i / chunkSize) + 1}: ${chunk.length} items (no special SKUs)`);
//     }

//     try {
//       const result = await Product.bulkWrite(chunk, { ordered: false });

//       const successCount = result.nModified || result.modifiedCount || 0;
//       const matchedCount = result.nMatched || result.matchedCount || 0;
//       const upsertedCount = result.upsertedCount || 0;

//       totalProcessed += successCount;

//       console.log(
//         `✅ Chunk ${
//           Math.floor(i / chunkSize) + 1
//         }: matched ${matchedCount}, updated ${successCount}, upserted ${upsertedCount}`
//       );
//     } catch (err) {
//       totalFailed += chunk.length;
//       failedSkus.push(...chunkSkus);

//       console.error(
//         `❌ Chunk ${Math.floor(i / chunkSize) + 1} failed. ${
//           chunk.length
//         } updates skipped. SKUs: ${chunkSkus.join(", ")}`
//       );
//     }
//   }

//   console.log(`Processed ${bulkOperations.length} updates total.`);
//   if (totalFailed > 0) {
//     console.warn(
//       `⚠️ ${totalFailed} updates failed. Affected SKUs: ${failedSkus.join(
//         ", "
//       )}`
//     );
//   }
// };

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
      filter["brand.name"] = new RegExp(`^${brand}$`, "i");
    }
    if (category) {
      filter["category.name"] = new RegExp(`^${category}$`, "i");
    }
    if (productType) {
      filter["productType.name"] = new RegExp(`^${productType}$`, "i");
    }
    if (color) {
      filter["color.name"] = new RegExp(`^${color}$`, "i");
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
    if (category) {
      // If category is selected, sort by brand name ascending
      sortOptions["brand.name"] = 1;
    } else if (sortBy) {
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
//     // Parse pagination params safely
//     const skip = Math.max(parseInt(query.skip, 10) || 0, 0);
//     const take = Math.min(parseInt(query.take, 10) || 10, 100); // cap page size

//     const { brand, category, productType, color, search, status, sortBy } =
//       query;

//     const filter = {};
//     const sortOptions = {};

//     // -------------------------
//     // 1️⃣ Apply filters
//     // -------------------------
//     if (brand) filter["brand.name"] = new RegExp(`^${brand}$`, "i");
//     if (category) filter["category.name"] = new RegExp(`^${category}$`, "i");
//     if (productType)
//       filter["productType.name"] = new RegExp(`^${productType}$`, "i");
//     if (color) filter["color.name"] = new RegExp(`^${color}$`, "i");
//     if (status) filter.status = status;

//     // -------------------------
//     // 2️⃣ Global search
//     // -------------------------
//     if (search) {
//       const searchRegex = new RegExp(search, "i");
//       filter.$or = [
//         { title: searchRegex },
//         { "brand.name": searchRegex },
//         { "category.name": searchRegex },
//         { "color.name": searchRegex },
//         { "color.code": searchRegex },
//         { "productType.name": searchRegex },
//         { description: searchRegex },
//         { additionalInformation: searchRegex },
//         { tags: searchRegex },
//         { sku: searchRegex },
//         { unit: searchRegex },
//       ];
//     }

//     // -------------------------
//     // 3️⃣ Sorting (stable)
//     // -------------------------
//     if (category) {
//       sortOptions["brand.name"] = 1;
//       sortOptions["_id"] = 1; // ensure stability
//     } else if (sortBy) {
//       switch (sortBy.toUpperCase()) {
//         case "LTH":
//           sortOptions.price = 1;
//           sortOptions["_id"] = 1;
//           break;
//         case "HTL":
//           sortOptions.price = -1;
//           sortOptions["_id"] = 1;
//           break;
//         default:
//           sortOptions.createdAt = -1;
//           sortOptions["_id"] = 1;
//       }
//     } else {
//       sortOptions.createdAt = -1;
//       sortOptions["_id"] = 1;
//     }

//     // -------------------------
//     // 4️⃣ Query + Count (parallel)
//     // -------------------------
//     const [products, totalCount] = await Promise.all([
//       Product.find(filter)
//         .sort(sortOptions)
//         .skip(skip)
//         .limit(take)
//         .populate("reviews")
//         .lean(),
//       Product.countDocuments(filter),
//     ]);

//     return {
//       products,
//       totalCount,
//       skip,
//       take,
//       totalPages: Math.ceil(totalCount / take),
//     };
//   } catch (error) {
//     console.error("Error in getFilteredPaginatedProductsService:", error);
//     throw new Error("Failed to retrieve products.");
//   }
// };
