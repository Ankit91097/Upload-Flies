const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
// const redis = require("../config/redis");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    // Count how many users already exist
    const userCount = await User.countDocuments();

    // If no users yet → make first user an admin
    const role = userCount === 0 ? "admin" : "client";

    // Hash password and save
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    // await redis.set(`user:${user._id}`, JSON.stringify(user));

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      msg: `Registered successfully as ${role}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    // await redis.set(`user:${user._id}`, JSON.stringify(user));
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(400).json({ msg: "No token found" });
    }
    // await redis.set(`blackList:${token}`, true);
    res.clearCookie("token");
    res.status(200).json({
      success: true,
      message: "Client logged out successfully",
    });
  } catch (error) {
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
};

exports.sendOTP = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ msg: "Email not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // valid for 10 minutes

  user.resetOTP = { code: otp, expiresAt };
  await user.save();

  await sendEmail(email, "Password Reset OTP", `Your OTP is: ${otp}`);
  res.json({ msg: "OTP sent to email" });
};

exports.verifyOTP = async (req, res) => {
  const { otp } = req.body;

  // Check if OTP is provided
  if (!otp) return res.status(400).json({ msg: "OTP is required" });

  // Find the user whose OTP matches
  const user = await User.findOne({ "resetOTP.code": otp });

  if (!user || !user.resetOTP)
    return res.status(400).json({ msg: "Invalid or expired OTP" });

  const { code, expiresAt } = user.resetOTP;

  // Check expiry
  if (Date.now() > new Date(expiresAt))
    return res.status(400).json({ msg: "OTP expired" });

  // Match the OTP (already matched via findOne, but double check)
  if (code !== otp) return res.status(400).json({ msg: "Incorrect OTP" });

  // ✅ Optional: Clear OTP after success
  user.resetOTP = undefined;
  await user.save();

  // ✅ Send back email (to pass to reset password page)
  res.json({ msg: "OTP verified", email: user.email });
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.resetOTP) return res.status(400).json({ msg: "Invalid" });

  if (
    user.resetOTP.code !== otp ||
    Date.now() > new Date(user.resetOTP.expiresAt)
  ) {
    return res.status(400).json({ msg: "OTP invalid or expired" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.resetOTP = undefined;
  await user.save();

  res.json({ msg: "Password reset successfully" });
};
