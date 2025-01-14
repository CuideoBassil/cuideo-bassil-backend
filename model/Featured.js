const mongoose = require("mongoose");
const validator = require("validator");

const featuredSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a name for this product."],
      trim: true,
      minLength: [3, "Name must be at least 3 characters."],
      maxLength: [200, "Name is too large"],
    },
    description: {
      type: String,
      required: false,
    },
    img: {
      type: String,
      required: true,
      validate: [validator.isURL, "Please provide valid url(s)"],
    },
    background: {
      type: String,
      required: true,
      validate: [validator.isURL, "Please provide valid url(s)"],
    },
    price: {
      type: Number,
      required: false,
      min: [0, "Product price can't be negative"],
    },
    discounted: {
      type: Number,
      required: false,
      min: [0, "Product discounted price can't be negative"],
    },
    section: {
      type: Number,
      required: true,
      default: 1,
      enum: [1, 2, 3],
    },
  },
  {
    timestamps: true,
  }
);

const Featured = mongoose.model("Featured", featuredSchema);

module.exports = Featured;
