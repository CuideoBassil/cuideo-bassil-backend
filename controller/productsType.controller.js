const ProductsType = require('../model/ProductsType');
const productsTypeService = require('../services/productsType.service');

// add a productsType 
exports.addProductsType = async (req, res,next) => {
  try {
    const result = await productsTypeService.addProductsTypeService(req.body);
    res.status(200).json({
      status: "success",
      message: "ProductsType created successfully!",
      data: result,
    });
  } catch (error) {
    next(error)
  }
}

// add all ProductsType
exports.addAllProductsType = async (req,res,next) => {
  try {
    const result = await productsTypeService.addAllProductsTypeService(req.body);
    res.json({
      message:'ProductsTypes added successfully',
      result,
    })
  } catch (error) {
    next(error)
  }
}

// get active ProductsType
exports.getAllProductsTypes = async (req,res,next) => {
  try {
    const result = await ProductsType.find({},{name:1});
    res.status(200).json({
      success:true,
      result,
    })
  } catch (error) {
    next(error)
  }
}

// get active ProductsType
exports.getActiveProductsTypes = async (req,res,next) => {
  try {
    const result = await productsTypeService.getProductsTypesService();
    res.status(200).json({
      success:true,
      result,
    })
  } catch (error) {
    next(error)
  }
}

// delete ProductsType
exports.deleteProductsType = async (req,res,next) => {
  try {
    await productsTypeService.deleteProductsTypesService(req.params.id);
    res.status(200).json({
      success:true,
      message:'ProductsType delete successfully',
    })
  } catch (error) {
    next(error)
  }
}

// update category
exports.updateProductsType = async (req,res,next) => {
  try {
    const result = await productsTypeService.updateProductsTypeService(req.params.id,req.body);
    res.status(200).json({
      status:true,
      message:'ProductsType update successfully',
      data:result,
    })
  } catch (error) {
    next(error)
  }
}

// get single category
exports.getSingleProductsType = async (req,res,next) => {
  try {
    const result = await productsTypeService.getSingleProductsTypeService(req.params.id);
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}