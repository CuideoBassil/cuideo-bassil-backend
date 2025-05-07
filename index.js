require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const { secret } = require("./config/secret");
const PORT = secret.port || 7000;
const morgan = require("morgan");

// Import node-cron
const cron = require("node-cron");

// error handler
const globalErrorHandler = require("./middleware/global-error-handler");

// routes
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const brandRoutes = require("./routes/brand.routes");
const deliveryDistrictRoutes = require("./routes/deliveryDistrict.routes");
const productsTypeRoutes = require("./routes/productType.routes");

const userOrderRoutes = require("./routes/user.order.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const couponRoutes = require("./routes/coupon.routes");
const reviewRoutes = require("./routes/review.routes");
const adminRoutes = require("./routes/admin.routes");
const tagRoutes = require("./routes/tag.routes");
const featuredRoutes = require("./routes/featured.routes");
// const uploadRouter = require('./routes/uploadFile.route');
const cloudinaryRoutes = require("./routes/cloudinary.routes");
const {
  clearExpiredDiscountsService,
  syncProductIdsWithCategoriesService,
} = require("./services/product.service");

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

// connect database
connectDB();

app.use("/api/user", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/brand", brandRoutes);
app.use("/api/deliveryDistrict", deliveryDistrictRoutes);
app.use("/api/productType", productsTypeRoutes);
app.use("/api/product", productRoutes);
// app.use('/api/upload',uploadRouter);
app.use("/api/order", orderRoutes);
app.use("/api/coupon", couponRoutes);
app.use("/api/user-order", userOrderRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tag", tagRoutes);
app.use("/api/featured", featuredRoutes);

// root route
app.get("/", (req, res) => res.send("Apps worked successfully"));

// global error handler
app.use(globalErrorHandler);

//* handle not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API Not Found",
      },
    ],
  });
  next();
});

cron.schedule("30 0 * * *", async () => {
  console.log("Running the category check job...");
  await syncProductIdsWithCategoriesService();
});

cron.schedule("* 1 * * *", async () => {
  console.log("Running the discount clearance job...");
  await clearExpiredDiscountsService();
});

app.listen(PORT, () => console.log(`server running on port ${PORT}`));

module.exports = app;
