const ApiError = require("../errors/api-error");
const DeliveryDistrict = require("../model/deliveryDistrict");

// addDeliveryDistrictService
module.exports.addDeliveryDistrictService = async (data) => {
  const deliveryDistrict = await DeliveryDistrict.create(data);
  return deliveryDistrict;
};

// create all DeliveryDistricts service
exports.addAllDeliveryDistrictService = async (data) => {
  await DeliveryDistrict.deleteMany();
  const deliveryDistricts = await DeliveryDistrict.insertMany(data);
  return deliveryDistricts;
};

// get all DeliveryDistricts service
exports.getDeliveryDistrictsService = async () => {
  const deliveryDistricts = await DeliveryDistrict.find({
    status: "active",
  }).populate("products");
  return deliveryDistricts;
};

// get all DeliveryDistricts service
exports.deleteDeliveryDistrictsService = async (id) => {
  const deliveryDistricts = await DeliveryDistrict.findByIdAndDelete(id);
  return deliveryDistricts;
};

// update category
exports.updateDeliveryDistrictService = async (id, payload) => {
  const isExist = await DeliveryDistrict.findOne({ _id: id });

  if (!isExist) {
    throw new ApiError(404, "DeliveryDistrict not found !");
  }

  const result = await DeliveryDistrict.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

// get single category
exports.getSingleDeliveryDistrictService = async (id) => {
  const result = await DeliveryDistrict.findById(id);
  return result;
};
