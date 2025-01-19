const Featured = require("../model/Featured");
const featuredService = require("../services/featured.service");

// add a featured
exports.addFeatured = async (req, res, next) => {
  try {
    const result = await featuredService.addFeaturedService(req.body);
    res.status(200).json({
      status: "success",
      message: "Featured created successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all Featured
exports.addAllFeatured = async (req, res, next) => {
  try {
    const result = await featuredService.addAllFeaturedService(req.body);
    res.json({
      message: "Featured added successfully",
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get all Featured
exports.getAllFeatured = async (req, res, next) => {
  try {
    const result = await Featured.find({}).sort({ _id: -1 });
    res.status(200).json({
      status: true,
      message: "Featured get successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// get Featured by section
exports.getFeaturedBySection = async (req, res, next) => {
  try {
    const result = await featuredService.getFeaturedBySectionService(req);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get active Featured
exports.getActiveFeatured = async (req, res, next) => {
  try {
    const result = await featuredService.getFeaturedService();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// delete Featured
exports.deleteFeatured = async (req, res, next) => {
  try {
    await featuredService.deleteFeaturedService(req.params.id);
    res.status(200).json({
      success: true,
      message: "Featured delete successfully",
    });
  } catch (error) {
    next(error);
  }
};

// update category
exports.updateFeatured = async (req, res, next) => {
  try {
    const result = await featuredService.updateFeaturedService(
      req.params.id,
      req.body
    );
    res.status(200).json({
      status: true,
      message: "Featured update successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get single category
exports.getSingleFeatured = async (req, res, next) => {
  try {
    const result = await featuredService.getSingleFeaturedService(
      req.params.id
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
