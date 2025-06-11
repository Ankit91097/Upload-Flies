const express = require("express");
const router = express.Router();
const { register, login, logout, sendOTP, verifyOTP, resetPassword } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.post("/forgot-password", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
