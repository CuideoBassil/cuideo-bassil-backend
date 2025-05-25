const PageService = require("../services/page.service");

// Add a single page
exports.addPageController = async (req, res, next) => {
  try {
    const result = await PageService.addPageService(req.body);
    res.status(200).json({
      status: "success",
      message: "Page created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Add multiple pages (replace all)
exports.addAllPagesController = async (req, res, next) => {
  try {
    const pages = await PageService.addAllPagesService(req.body);
    res.status(201).json({
      success: true,
      message: "All pages added successfully",
      data: pages,
    });
  } catch (error) {
    next(error);
  }
};

// Get a page by key
exports.getPageByKeyController = async (req, res, next) => {
  try {
    const { key } = req.params;
    const page = await PageService.getPageByKeyService(key);
    res.status(200).json({
      success: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

// Get all pages (optional)
exports.getAllPagesController = async (req, res, next) => {
  try {
    const pages = await PageService.getPagesService();
    res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    next(error);
  }
};

// Update a page by ID
exports.updatePage = async (req, res, next) => {
  try {
    const result = await PageService.updatePageService(req.params.id, req.body);
    res.status(200).json({
      status: true,
      message: "Page update successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a page by ID
exports.deletePageController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedPage = await PageService.deletePageService(id);
    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
      data: deletedPage,
    });
  } catch (error) {
    next(error);
  }
};
