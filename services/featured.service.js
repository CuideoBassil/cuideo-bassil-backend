const ApiError = require("../errors/api-error");
const Featured = require("../model/Featured");

// addFeaturedService
module.exports.addFeaturedService = async (data) => {
  const featured = await Featured.create(data);
  return featured;
};

// create all Featured service
exports.addAllFeaturedService = async (data) => {
  await Featured.deleteMany();
  const featured = await Featured.insertMany(data);
  return featured;
};

// get all Featured service
exports.getFeaturedService = async () => {
  const featured = await Featured.find({ status: "active" }).populate(
    "products"
  );
  return featured;
};

// get all Featured service
exports.deleteFeaturedService = async (id) => {
  const featured = await Featured.findByIdAndDelete(id);
  return featured;
};

// update category
exports.updateFeaturedService = async (id, payload) => {
  const isExist = await Featured.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, "Featured not found !");
  }

  const result = await Featured.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// get single category
exports.getSingleFeaturedService = async (id) => {
  const result = await Featured.findById(id);
  return result;
};
