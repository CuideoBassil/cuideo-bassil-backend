const mongoose = require("mongoose");

const productsTypeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name for this product."],
      trim: true,
      minLength: [3, "Name must be at least 3 characters."],
      maxLength: [200, "Name is too large"],
    },
    image: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const ProductsType = mongoose.model("ProductsType", productsTypeSchema);

module.exports = ProductsType;
