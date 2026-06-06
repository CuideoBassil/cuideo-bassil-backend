const express = require("express");
const router = express.Router();
// internal
const productController = require("../controller/product.controller");
const productImportController = require("../controller/productImport.controller");
const excelUploader = require("../middleware/excelUploader");

// add a product
router.post("/add", productController.addProduct);

// add all products
router.post("/add-all", productController.addAllProducts);

// download the Excel import template (dropdowns reflect current data)
router.get("/import-template", productImportController.downloadProductTemplate);

// batch import products from an Excel file (field name: "file")
// ?mode=validate for a dry run, ?mode=commit (default) to save
router.post(
  "/import-excel",
  excelUploader.single("file"),
  productImportController.importProductsExcel
);

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
