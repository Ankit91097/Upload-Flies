
const cron = require("node-cron");
const Document = require("../models/Document");
const sendEmail = require("../utils/sendEmail");

cron.schedule("* * * * *", async () => {
  console.log("🔔 Running reminder check...");

  const now = new Date();
  const nextMinute = new Date(now.getTime() + 60 * 1000);

  // 📌 Find documents expiring soon AND not already reminded
  const expiringDocs = await Document.find({
    expiryDate: { $lte: nextMinute },
    reminderSent: false
  }).populate("client");

  for (let doc of expiringDocs) {
    const message = `Hello ${doc.client.name},\n\nThis is a reminder that your document "${doc.name}" is expiring on ${new Date(doc.expiryDate).toLocaleString()}.\n\nPlease take necessary action.`;

    try {
      await sendEmail(doc.client.email, "⏰ Document Expiry Reminder", message);
      console.log(`📧 Sent reminder to ${doc.client.email} for "${doc.name}"`);

      // ✅ Mark reminder as sent
      doc.reminderSent = true;
      await doc.save();
    } catch (err) {
      console.error(`❌ Failed to send email for ${doc.name}:`, err.message);
    }
  }
});
