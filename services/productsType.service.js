const ApiError = require('../errors/api-error');
const ProductsType = require('../model/ProductsType');

// addProductsTypeService
module.exports.addProductsTypeService = async (data) => {
  const productsType = await ProductsType.create(data);
  return productsType
}

// create all ProductsTypes service
exports.addAllProductsTypeService = async (data) => {
  await ProductsType.deleteMany()
  const productsTypes = await ProductsType.insertMany(data);
  return productsTypes;
}


// get all ProductsTypes service
exports.getProductsTypesService = async () => {
  const productsTypes = await ProductsType.find({status:'active'}).populate('products');
  return productsTypes;
}

// get all ProductsTypes service
exports.deleteProductsTypesService = async (id) => {
  const productsTypes = await ProductsType.findByIdAndDelete(id);
  return productsTypes;
}

// update category
exports.updateProductsTypeService = async (id,payload) => {
  const isExist = await ProductsType.findOne({ _id:id })

  if (!isExist) {
    throw new ApiError(404, 'ProductsType not found !')
  }

  const result = await ProductsType.findOneAndUpdate({ _id:id }, payload, {
    new: true,
  })
  return result
}

// get single category
exports.getSingleProductsTypeService = async (id) => {
  const result = await ProductsType.findById(id);
  return result;
}