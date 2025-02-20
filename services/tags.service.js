const ApiError = require("../errors/api-error");
const Tags = require("../model/tags");

// Add Tag Service (Checks if the tag exists before adding)
module.exports.addTagService = async (data) => {
  const existingTag = await Tags.findOne({ name: data.name.trim() });

  if (existingTag) {
    return existingTag;
  }

  const newTag = await Tags.create(data);
  return newTag;
};

// Create all Tags service
exports.addAllTagService = async (data) => {
  await Tags.deleteMany();
  const tags = await Tags.insertMany(data);
  return tags;
};

// Get all Tags service
exports.getTagsService = async () => {
  const tags = await Tags.find({ status: "active" }).populate("products");
  return tags;
};

// Delete Tags service
exports.deleteTagsService = async (id) => {
  const tags = await Tags.findByIdAndDelete(id);
  return tags;
};

// Update Tag service
exports.updateTagService = async (id, payload) => {
  const isExist = await Tags.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, "Tag not found !");
  }

  const result = await Tags.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// Get Single Tag service
exports.getSingleTagService = async (id) => {
  const result = await Tags.findById(id);
  return result;
};
