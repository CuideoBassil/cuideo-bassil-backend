const express = require("express");
const {
  addOrder,
  getOrders,
  updateOrderStatus,
  getSingleOrder,
  getPendingOrders,
} = require("../controller/order.controller");

// router
const router = express.Router();

router.get("/pending", getPendingOrders);
router.get("/", getOrders);
router.get("/:id", getSingleOrder);
router.post("/add", addOrder);
router.patch("/update-status/:id", updateOrderStatus);

module.exports = router;
