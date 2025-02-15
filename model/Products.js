const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const validator = require("validator");

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    brand: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
      name: { type: String },
    },
    category: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
      name: { type: String },
    },
    sku: { type: String, required: true },
    color: {
      type: {
        code: { type: String },
        name: { type: String },
      },
      required: true,
    },
    image: { type: String, required: true },
    additionalImages: [{ type: String }],
    slug: { type: String, required: true },
    unit: { type: String },
    tags: [String],
    parent: { type: String },
    children: [String],
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    status: { type: String, default: "in-stock" },
    productType: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "ProductsType" },
      name: { type: String },
    },
    description: { type: String },
    additionalInformation: { type: String },
    offerDate: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reviews" }],
  },
  { timestamps: true }
);

const Products = mongoose.model("Products", ProductSchema);

module.exports = Products;
