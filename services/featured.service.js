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
  const featured = await Featured.find().populate("products");
  return featured;
};

// get Featured by section service
// exports.getFeaturedBySectionService = async (section) => {
//   const featured = await Featured.find({ section });
//   return featured;
// };

exports.getFeaturedBySectionService = async (req) => {
  const section = req.params.section;
  let featured = await Featured.find({ section });

  return featured;
};

// get all Featured service
exports.deleteFeaturedService = async (id) => {
  const featured = await Featured.findByIdAndDelete(id);
  return featured;
};

// update Featured
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

// get single Featured
exports.getSingleFeaturedService = async (id) => {
  const result = await Featured.findById(id);
  return result;
};
