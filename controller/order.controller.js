const { secret } = require("../config/secret");
const stripe = require("stripe")(secret.stripe_key);
const ApiError = require("../errors/api-error");
const {
  createOrderService,
  getOrdersService,
  getOrderByIdService,
  updateOrderStatusService,
  getPendingOrdersService,
} = require("../services/order.service");

// create-payment-intent
exports.paymentIntent = async (req, res, next) => {
  try {
    const product = req.body;
    const price = Number(product.price);
    const amount = price * 100;
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      currency: "usd",
      amount: amount,
      payment_method_types: ["card"],
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};

// addOrder
exports.addOrder = async (req, res, next) => {
  try {
    // Use service to create order & send email
    const order = await createOrderService(req.body);

    res.status(200).json({
      success: true,
      message:
        "Order added successfully. Please check WhatsApp to confirm sending message.",
      order, // return order for frontend WhatsApp link creation
    });
  } catch (error) {
    next(error);
  }
};

// get Orders
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await getOrdersService();
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// get Single Order
exports.getSingleOrder = async (req, res, next) => {
  try {
    const order = await getOrderByIdService(req.params.id);
    res.status(200).json({
      success: true,
      data: order, // includes detailedProducts now
    });
  } catch (error) {
    next(error);
  }
};

// update Order Status
exports.updateOrderStatus = async (req, res, next) => {
  const newStatus = req.body.status;
  try {
    const updatedOrder = await updateOrderStatusService(
      req.params.id,
      newStatus
    );

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};

//get pending orders
exports.getPendingOrders = async (req, res, next) => {
  try {
    const orders = await getPendingOrdersService();
    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};
