const express = require("express");
const router = express.Router();
// internal
const tagController = require("../controller/tags.controller");

// add Tag
router.post("/add", tagController.addTag);
// add All Tag
router.post("/add-all", tagController.addAllTags);
// get Active Tags
router.get("/active", tagController.getActiveTags);
// get all Tags
router.get("/all", tagController.getAllTags);
// delete tag
router.delete("/delete/:id", tagController.deleteTag);
// get single
router.get("/get/:id", tagController.getSingleTag);
// delete product
router.patch("/edit/:id", tagController.updateTag);

module.exports = router;
