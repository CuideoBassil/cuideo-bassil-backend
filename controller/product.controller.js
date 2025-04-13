const productServices = require("../services/product.service");

// Add product
exports.addProduct = async (req, res, next) => {
  try {
    const productData = {
      title: req.body.title,
      brand: {
        id: req.body.brand?.id,
        name: req.body.brand?.name,
      },
      category: {
        id: req.body.category?.id,
        name: req.body.category?.name,
      },
      sku: req.body.sku,
      color: req.body.color,
      image: req.body.image,
      additionalImages: req.body.additionalImages || [],
      slug: req.body.slug,
      unit: req.body.unit,
      tags: req.body.tags || [],
      parent: req.body.parent,
      children: req.body.children || [],
      price: req.body.price,
      discount: req.body.discount || 0,
      quantity: req.body.quantity,
      status: req.body.status || "in-stock",
      productType: {
        id: req.body.productType?.id,
        name: req.body.productType?.name,
      },
      description: req.body.description,
      additionalInformation: req.body.additionalInformation,
      offerDate: {
        startDate: req.body.offerDate?.startDate,
        endDate: req.body.offerDate?.endDate,
      },
      reviews: req.body.reviews || [],
    };

    const result = await productServices.createProductService(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Add multiple products
exports.addAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.addAllProductService(req.body);
    res.status(201).json({
      success: true,
      message: "Products added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get all products
exports.getAllProducts = async (req, res, next) => {
  try {
    const result = await productServices.getAllProductsService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get products by type
exports.getProductsByType = async (req, res, next) => {
  try {
    const result = await productServices.getProductTypeService(req);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get products with dynamic filters
exports.getProductsWithDynamicFilter = async (req, res, next) => {
  try {
    const result = await productServices.getProductsWithDynamicFilterService(
      req
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get all products with types
exports.getAllProductsWithTypes = async (req, res, next) => {
  try {
    const type = req.params.type ? req.params.type.split(",") : [];
    req.params.type = type;

    req.params.skip = req.query.skip ? parseInt(req.query.skip, 10) : -1;
    req.params.take = req.query.take ? parseInt(req.query.take, 10) : -1;

    const result = await productServices.getAllProductsWithTypesService(req);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get offer products
exports.getOfferTimerProducts = async (req, res, next) => {
  try {
    const result = await productServices.getOfferTimerProductService(
      req.query.type
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get popular products by type
exports.getPopularProductByType = async (req, res, next) => {
  try {
    const result = await productServices.getPopularProductServiceByType(
      req.params.type
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get top-rated products
exports.getTopRatedProducts = async (req, res, next) => {
  try {
    const result = await productServices.getTopRatedProductService();
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get single product
exports.getSingleProduct = async (req, res, next) => {
  try {
    const product = await productServices.getProductService(req.params.id);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// Get related products
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const products = await productServices.getRelatedProductService(
      req.params.id
    );
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Update product
exports.updateProduct = async (req, res, next) => {
  try {
    const updatedProduct = await productServices.updateProductService(
      req.params.id,
      req.body
    );
    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

// Get reviewed products
exports.reviewProducts = async (req, res, next) => {
  try {
    const products = await productServices.getReviewsProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Get stock-out products
exports.stockOutProducts = async (req, res, next) => {
  try {
    const products = await productServices.getStockOutProducts();
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Delete product
exports.deleteProduct = async (req, res, next) => {
  try {
    await productServices.deleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Update product quantities
exports.updateQuantities = async (req, res, next) => {
  const updates = req.body;

  if (!Array.isArray(updates)) {
    return res
      .status(400)
      .json({ error: "Invalid data format. Expected an array of objects." });
  }

  try {
    await productServices.updateQuantitiesService(updates);
    res
      .status(200)
      .json({ success: true, message: "Quantities updated successfully." });
  } catch (error) {
    next(error);
  }
};

exports.getFilteredPaginatedProducts = async (req, res) => {
  try {
    console.log("GET /filtered/paginated hit");
    const products = await productServices.getFilteredPaginatedProductsService(
      req.query
    );
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching filtered paginated products:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};
