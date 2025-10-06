require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cookieParser = require("cookie-parser");

const app = express();
connectDB();
app.use(cors());
app.use(express.json());
// app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api", documentRoutes);
app.use("/api", notificationRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
require("./cronJobs/reminderJob"); // <-- add this line after all routes
