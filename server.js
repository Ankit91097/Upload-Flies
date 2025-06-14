require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");


const app = express();
connectDB();
app.use(cors());
app.use(express.json());
// app.use("/uploads", express.static("uploads"));

app.use("/api", authRoutes);
app.use("/api", documentRoutes);
app.use("/api", notificationRoutes);

// require("./cronJobs/reminderJob"); // Start cron job

app.listen(5000, () => console.log("Server running on port 5000"));
require("./cronJobs/reminderJob"); // <-- add this line after all routes