const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: String,
  type: String,
  description: String,
  fileUrl: {
    type: String,
    required: true,
  },
  expiryDate: Date,
  createdAt: { type: Date, default: Date.now },
  // reminderSent: {
  //   type: Boolean,
  //   default: false,
  // },
  reminderHistory: [
    {
      sentAt: Date,
    },
  ],
});

module.exports = mongoose.model("Document", documentSchema);
