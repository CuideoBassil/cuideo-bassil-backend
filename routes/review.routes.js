const express = require("express");
const router = express.Router();
const {
  addReview,
  deleteReviews,
  deleteSingleReview,
} = require("../controller/review.controller");

// add a review
router.post("/add", addReview);
// delete reviews
router.delete("/delete/:id", deleteReviews);
// delete single review
router.delete("/delete/single/:id", deleteSingleReview);

module.exports = router;
