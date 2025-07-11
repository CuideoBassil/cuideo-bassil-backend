const ApiError = require("../errors/api-error");
const Order = require("../model/Order");
const Products = require("../model/Products"); // <-- added import
const DeliveryDistricts = require("../model/deliveryDistrict");
const { sendEmail } = require("../config/email");

// Create Order Service
exports.createOrderService = async (data) => {
  // Validate delivery district exists
  const deliveryDistrict = await DeliveryDistricts.findById(
    data.deliveryDistrict
  );
  if (!deliveryDistrict) {
    throw new ApiError(404, "Delivery district not found");
  }

  // Generate unique invoice number
  let invoice = Date.now();

  // Add deliveryDistrict and invoiceNumber
  data.deliveryDistrict = deliveryDistrict._id;
  data.invoice = invoice;
  // Create the order
  const order = await Order.create(data);

  const emailBody = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `New Order: ${order.fullName} #${order.phoneNumber}`,
    text: `
New Order Received!

Invoice: ${order.invoice}
Name: ${order.fullName}
Phone: ${order.phoneNumber}
Email: ${order?.emailAddress || "Not provided"}
Products:\n ${data.orderProducts
      .map(
        (p, index) =>
          `#${index + 1} SKU: ${p.sku}, Title: ${p.title}, Quantity: ${
            p.orderQuantity
          }`
      )
      .join(",\n")}
Amount: $${order.amount}
Discounted Amount: $${order.discountedAmount}
District: ${deliveryDistrict.name}
City: ${order.city}
Street: ${order.street}
Building: ${order.building}
Floor: ${order.floor}
Note: ${order.orderNote || "None"}

Please check the admin dashboard for more details.
    `,
  };

  // Send email
  try {
    sendEmail(emailBody);
  } catch (error) {
    console.error("Failed to send order notification email:", error.message);
  }

  return order;
};

// Get all orders service
exports.getOrdersService = async () => {
  return await Order.find().populate("deliveryDistrict");
};

// Get single order by ID service with product details enrichment
exports.getOrderByIdService = async (id) => {
  const order = await Order.findById(id).populate("deliveryDistrict");
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Enrich each product with details from Products model
  const detailedProducts = await Promise.all(
    order.orderProducts.map(async (item) => {
      const product = await Products.findOne({ sku: item.sku }).select(
        "title brand.name color.name price discount"
      );
      if (!product) {
        return { sku: item.sku, quantity: item.orderQuantity };
      }

      return {
        sku: item.sku,
        quantity: item.orderQuantity,
        title: product.title,
        brandName: product.brand?.name || null,
        colorName: product.color?.name || null,
        price: product.price,
        discountedPrice:
          product.discount && product.discount > 0
            ? product.discount
            : product.price,
      };
    })
  );

  // Return order with detailed products array
  return {
    ...order.toObject(),
    detailedProducts,
  };
};

// Update order status
exports.updateOrderStatusService = async (id, status) => {
  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  order.status = status;
  await order.save();
  return order;
};

// Delete order service
exports.deleteOrderService = async (id) => {
  const order = await Order.findByIdAndDelete(id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  return order;
};
// Get only pending orders
exports.getPendingOrdersService = async () => {
  return await Order.find({ status: "pending" }).populate("deliveryDistrict");
};
