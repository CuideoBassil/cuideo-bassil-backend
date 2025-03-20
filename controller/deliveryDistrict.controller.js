const DeliveryDistrict = require("../model/deliveryDistrict");
const deliveryDistrictService = require("../services/deliveryDistrict.service");

// add a deliveryDistrict
exports.addDeliveryDistrict = async (req, res, next) => {
  try {
    const result = await deliveryDistrictService.addDeliveryDistrictService(
      req.body
    );
    res.status(200).json({
      status: "success",
      message: "Delivery District created successfully!",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// add all DeliveryDistrict
exports.addAllDeliveryDistrict = async (req, res, next) => {
  try {
    const result = await deliveryDistrictService.addAllDeliveryDistrictService(
      req.body
    );
    res.json({
      message: "Delivery Districts added successfully",
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active DeliveryDistrict
exports.getAllDeliveryDistricts = async (req, res, next) => {
  try {
    const result = await DeliveryDistrict.find(
      {},
      { name: 1, deliveryCost: 1 }
    );
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// get active DeliveryDistrict
exports.getActiveDeliveryDistricts = async (req, res, next) => {
  try {
    const result = await deliveryDistrictService.getDeliveryDistrictsService();
    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    next(error);
  }
};

// delete DeliveryDistrict
exports.deleteDeliveryDistrict = async (req, res, next) => {
  try {
    await deliveryDistrictService.deleteDeliveryDistrictsService(req.params.id);
    res.status(200).json({
      success: true,
      message: "Delivery District delete successfully",
    });
  } catch (error) {
    next(error);
  }
};

// update category
exports.updateDeliveryDistrict = async (req, res, next) => {
  try {
    const result = await deliveryDistrictService.updateDeliveryDistrictService(
      req.params.id,
      req.body
    );
    res.status(200).json({
      status: true,
      message: "Delivery District update successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// get single category
exports.getSingleDeliveryDistrict = async (req, res, next) => {
  try {
    const result =
      await deliveryDistrictService.getSingleDeliveryDistrictService(
        req.params.id
      );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
