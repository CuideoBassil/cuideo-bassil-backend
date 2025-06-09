const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: false,
    },
    orderProducts: [
      {
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    discountedAmount: {
      type: Number,
      required: true,
    },
    orderNote: {
      type: String,
      required: false,
    },
    deliveryDistrict: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryDistrict",
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    building: {
      type: String,
      required: true,
    },
    floor: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash on delivery", "visa"],
      default: "cash on delivery",
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "delivered", "cancel"],
      lowercase: true,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports = Order;
