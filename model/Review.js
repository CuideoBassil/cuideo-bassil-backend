const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const validator = require("validator");

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String },
    email: {
      type: String,
      // validate: [validator.isEmail, "Provide a valid Email"],
      trim: true,
      lowercase: true,
    },
    productId: {
      type: ObjectId,
      ref: "Products",
      required: true,
    },
    rating: { type: Number, required: true, min: 0.5, max: 5 },
    comment: { type: String },
  },
  {
    timestamps: true,
  }
);

const Reviews = mongoose.model("Reviews", reviewSchema);
module.exports = Reviews;
