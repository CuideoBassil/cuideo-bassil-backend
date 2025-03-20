const express = require("express");
const router = express.Router();
// internal
const deliveryDistrictController = require("../controller/deliveryDistrict.controller");

// add deliveryDistrict
router.post("/add", deliveryDistrictController.addDeliveryDistrict);
// add All deliveryDistrict
router.post("/add-all", deliveryDistrictController.addAllDeliveryDistrict);
// get Active deliveryDistricts
router.get("/active", deliveryDistrictController.getActiveDeliveryDistricts);
// get all deliveryDistricts
router.get("/all", deliveryDistrictController.getAllDeliveryDistricts);
// delete deliveryDistrict
router.delete("/delete/:id", deliveryDistrictController.deleteDeliveryDistrict);
// get single
router.get("/get/:id", deliveryDistrictController.getSingleDeliveryDistrict);
// delete product
router.patch("/edit/:id", deliveryDistrictController.updateDeliveryDistrict);

module.exports = router;
