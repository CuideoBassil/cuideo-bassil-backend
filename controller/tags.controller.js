const Tags = require("../model/tags");
const tagsService = require("../services/tags.service");

// Add a tag (checks if it exists first)
exports.addTag = async (req, res, next) => {
  try {
    const result = await tagsService.addTagService(req.body);
    res.status(200).json({
      status: "success",
      message: result._id ? "Tag created successfully!" : "Tag already exists!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all Tags
exports.addAllTags = async (req, res, next) => {
  try {
    const result = await tagsService.addAllTagsService(req.body);
    res.json({
      message: "Tags added successfully",
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active Tags
exports.getAllTags = async (req, res, next) => {
  try {
    const result = await Tags.find({}, { name: 1 });
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active Tags
exports.getActiveTags = async (req, res, next) => {
  try {
    const result = await tagsService.getTagsService();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// delete Tags
exports.deleteTag = async (req, res, next) => {
  try {
    await tagsService.deleteTagsService(req.params.id);
    res.status(200).json({
      success: true,
      message: "Tags delete successfully",
    });
  } catch (error) {
    next(error);
  }
};

// update category
exports.updateTag = async (req, res, next) => {
  try {
    const result = await tagsService.updateTagsService(req.params.id, req.body);
    res.status(200).json({
      status: true,
      message: "Tags update successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get single category
exports.getSingleTag = async (req, res, next) => {
  try {
    const result = await tagsService.getSingleTagsService(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
