const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  type: String,
  description: String,
  fileUrl: String,
  expiryDate: Date,
  createdAt: { type: Date, default: Date.now },
  reminderSent: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Document", documentSchema);
