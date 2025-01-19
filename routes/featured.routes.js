const express = require("express");
const router = express.Router();
// internal
const featuredController = require("../controller/featured.controller");

// add Featured
router.post("/add", featuredController.addFeatured);
// add All Featured
router.post("/add-all", featuredController.addAllFeatured);
// get Active Featured
router.get("/active", featuredController.getActiveFeatured);
// get all Featured
router.get("/all", featuredController.getAllFeatured);
// get Featured by section
router.get("/:section", featuredController.getFeaturedBySection);
// delete featured
router.delete("/delete/:id", featuredController.deleteFeatured);
// get single
router.get("/get/:id", featuredController.getSingleFeatured);
// delete product
router.patch("/edit/:id", featuredController.updateFeatured);

module.exports = router;
