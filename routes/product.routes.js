const express = require("express");
const router = express.Router();
// internal
const productController = require("../controller/product.controller");

// add a product
router.post("/add", productController.addProduct);

// add all products
router.post("/add-all", productController.addAllProducts);

// get all products
router.get("/all", productController.getAllProducts);

// get offer timer product
router.get("/offer", productController.getOfferTimerProducts);

// top rated products
router.get("/top-rated", productController.getTopRatedProducts);

// reviews products
router.get("/review-product", productController.reviewProducts);

// ✅ get Products ByType with pagination and filters (must come before "/:type")
router.get(
  "/filtered/paginated",
  productController.getFilteredPaginatedProducts
);

// get popular products by type
router.get("/popular/:type", productController.getPopularProductByType);

// get Related Products
router.get("/related-product/:id", productController.getRelatedProducts);

// get Single Product
router.get("/single-product/:id", productController.getSingleProduct);

// stock Product
router.get("/stock-out", productController.stockOutProducts);

// edit product
router.patch("/edit-product/:id", productController.updateProduct);

// get Products With Type
router.get("/with/:type", productController.getAllProductsWithTypes);

// get Products Dynamic
router.get(
  "/dynamic/:skip/:take",
  productController.getProductsWithDynamicFilter
);

// delete product
router.delete("/:id", productController.deleteProduct);

// update product quantities
router.patch("/update-quantities", productController.updateQuantities);

// 🚨 this should come last to avoid catching routes like "filtered", "with", etc.
router.get("/:type", productController.getProductsByType);

module.exports = router;
