const Document = require("../models/Document");
const sendEmail = require("../utils/sendEmail");

exports.sendManualReminder = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId).populate("client");

    if (!document) return res.status(404).json({ msg: "Document not found" });

    const message = `Hello ${document.client.name},\n\nThis is a reminder that your document "${document.name}" is expiring on ${new Date(document.expiryDate).toDateString()}.\n\nPlease take action accordingly.`;

    await sendEmail(document.client.email, "Document Expiry Reminder", message);

    res.status(200).json({ msg: "Reminder sent successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Error sending email", error: err.message });
  }
};
