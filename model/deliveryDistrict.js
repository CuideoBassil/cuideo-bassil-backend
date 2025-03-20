const mongoose = require("mongoose");

const deliveryDistrictSchema = mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Please provide a district name"],
      maxLength: 100,
      unique: true,
    },
    deliveryCost: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

const DeliveryDistrict = mongoose.model(
  "DeliveryDistrict",
  deliveryDistrictSchema
);

module.exports = DeliveryDistrict;
