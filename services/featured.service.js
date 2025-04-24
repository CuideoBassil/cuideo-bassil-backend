const ApiError = require("../errors/api-error");
const Featured = require("../model/Featured");
const Product = require("../model/Products");

// Helper function to find product by SKU
const findProductBySku = async (sku) => {
  if (!sku) {
    return null;
  }
  return await Product.findOne({ sku });
};

// addFeaturedService
module.exports.addFeaturedService = async (data) => {
  if (data.productSku) {
    const product = await findProductBySku(data.productSku);
    if (!product) {
      throw new ApiError(400, "Product SKU not found in the system");
    }
    data.productId = product._id;
  }
  const featured = await Featured.create(data);
  return featured;
};

// create all Featured service
exports.addAllFeaturedService = async (data) => {
  const processedData = [];
  for (const item of data) {
    if (item.productSku) {
      const product = await findProductBySku(item.productSku);
      if (!product) {
        throw new ApiError(
          400,
          `Product SKU "${item.productSku}" not found in the system`
        );
      }
      processedData.push({ ...item, productId: product._id });
    } else {
      processedData.push(item);
    }
  }
  await Featured.deleteMany();
  const featured = await Featured.insertMany(processedData);
  return featured;
};

// get all Featured service
exports.getFeaturedService = async () => {
  const featured = await Featured.find().populate("productId");
  return featured;
};

exports.getFeaturedBySectionService = async (req) => {
  const section = req.params.section;
  let featured = await Featured.find({ section }).populate("productId");
  return featured;
};

// get all Featured service
exports.deleteFeaturedService = async (id) => {
  const featured = await Featured.findByIdAndDelete(id);
  return featured;
};

// update Featured
exports.updateFeaturedService = async (id, payload) => {
  if (payload.productSku) {
    const product = await findProductBySku(payload.productSku);
    if (!product) {
      throw new ApiError(400, "Product SKU not found in the system");
    }
    payload.productId = product._id;
  } else if (
    payload.productSku === null ||
    payload.productSku === undefined ||
    payload.productSku === ""
  ) {
    // If the user explicitly wants to remove the productId by providing null or undefined productSku
    payload.productId = null;
  }

  const isExist = await Featured.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, "Featured not found !");
  }

  const result = await Featured.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  }).populate("productId");
  return result;
};

// get single Featured
exports.getSingleFeaturedService = async (id) => {
  const result = await Featured.findById(id).populate("productId");
  return result;
};
