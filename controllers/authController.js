const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail=require('../utils/sendEmail')

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    res.status(201).json({ msg: "Registered successfully" ,user});
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

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ msg: "Server Error", error: err.message });
  }
};

exports.logout = async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({
    success: true,
    message: "Client logged out successfully",
  });
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
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.resetOTP)
    return res.status(400).json({ msg: "Invalid or expired OTP" });

  const { code, expiresAt } = user.resetOTP;

  if (Date.now() > new Date(expiresAt))
    return res.status(400).json({ msg: "OTP expired" });

  if (code !== otp)
    return res.status(400).json({ msg: "Incorrect OTP" });

  res.json({ msg: "OTP verified successfully" });
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.resetOTP) return res.status(400).json({ msg: "Invalid" });

  if (user.resetOTP.code !== otp || Date.now() > new Date(user.resetOTP.expiresAt)) {
    return res.status(400).json({ msg: "OTP invalid or expired" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.resetOTP = undefined;
  await user.save();

  res.json({ msg: "Password reset successfully" });
};
