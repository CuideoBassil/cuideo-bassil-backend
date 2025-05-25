const ApiError = require("../errors/api-error");
const Page = require("../model/page");

// Add a single Page
module.exports.addPageService = async (data) => {
  const page = await Page.create(data);
  return page;
};

// Add all Pages (replaces all existing)
module.exports.addAllPagesService = async (data) => {
  await Page.deleteMany();
  const pages = await Page.insertMany(data);
  return pages;
};

// Get a Page by Key
module.exports.getPageByKeyService = async (key) => {
  const page = await Page.findOne({ key });
  if (!page) {
    throw new ApiError(404, "Page not found!");
  }
  return page;
};

// Update a Page

exports.updatePageService = async (id, payload) => {
  const isExist = await Page.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, "Page not found !");
  }

  const result = await Page.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// Delete a Page
module.exports.deletePageService = async (id) => {
  const deletedPage = await Page.findByIdAndDelete(id);
  if (!deletedPage) {
    throw new ApiError(404, "Page not found!");
  }
  return deletedPage;
};

// (Optional) Get all Pages
module.exports.getPagesService = async () => {
  const pages = await Page.find().sort({ createdAt: -1 });
  return pages;
};
