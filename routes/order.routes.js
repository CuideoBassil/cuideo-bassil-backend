const express = require("express");
const {
  addOrder,
  getOrders,
  updateOrderStatus,
  getSingleOrder,
} = require("../controller/order.controller");

// router
const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getSingleOrder);
router.post("/add", addOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
