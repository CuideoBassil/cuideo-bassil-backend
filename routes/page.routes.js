const express = require("express");
const PageController = require("../controller/page.controller");

const router = express.Router();

router.post("/add", PageController.addPageController);
router.post("/bulk", PageController.addAllPagesController);
router.get("/", PageController.getAllPagesController);
router.get("/get/:key", PageController.getPageByKeyController);
router.patch("/edit/:id", PageController.updatePage);
router.delete("/delete/:id", PageController.deletePageController);

module.exports = router;
