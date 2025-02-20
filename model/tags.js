const mongoose = require("mongoose");

const tagsSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name for this tag."],
      trim: true,
      minLength: [1, "Name must be at least 3 characters."],
      maxLength: [100, "Name is too large"],
    },
  },
  {
    timestamps: true,
  }
);

const Tags = mongoose.model("Tags", tagsSchema);

module.exports = Tags;
