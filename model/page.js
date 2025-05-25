const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    data: {
      type: String,
      required: false,
      trim: false,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Page = mongoose.model("Page", pageSchema);

module.exports = Page;
