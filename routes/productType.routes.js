const express = require("express");
const router = express.Router();
// internal
const productsTypeController = require("../controller/productsType.controller");

// add ProductsType
router.post("/add", productsTypeController.addProductsType);
// add All ProductsType
router.post("/add-all", productsTypeController.addAllProductsType);
// get Active ProductsTypes
router.get("/active", productsTypeController.getActiveProductsTypes);
// get all ProductsTypes
router.get("/all", productsTypeController.getAllProductsTypes);
// delete productsType
router.delete("/delete/:id", productsTypeController.deleteProductsType);
// get single
router.get("/get/:id", productsTypeController.getSingleProductsType);
// delete product
router.patch("/edit/:id", productsTypeController.updateProductsType);

module.exports = router;
