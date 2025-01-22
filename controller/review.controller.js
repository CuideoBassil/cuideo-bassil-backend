const mongoose = require("mongoose");
const Order = require("../model/Order");
const Products = require("../model/Products");
const Review = require("../model/Review");
const User = require("../model/User");

// add a review
exports.addReview = async (req, res, next) => {
  const { name, email, productId, rating, comment } = req.body;
  try {
    // Create the new review
    const review = await Review.create(req.body);

    // Add the review to the product's reviews array
    const product = await Products.findById(productId);
    product.reviews.push(review._id);
    await product.save();

    return res.status(201).json({ message: "Review added successfully." });
  } catch (error) {
    next(error);
  }
};

// delete a review
exports.deleteReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const result = await Review.deleteMany({ productId: productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product reviews not found" });
    }
    res.json({ message: "All reviews deleted for the product" });
  } catch (error) {
    next(error);
  }
};

// delete Review
exports.deleteSingleReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const result = await Review.findByIdAndDelete(reviewId);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json({ message: "Review was deleted for the product" });
  } catch (error) {
    next(error);
  }
};
