const cron = require("node-cron");
const Document = require("../models/Document");
const sendEmail = require("../utils/sendEmail");

cron.schedule("* * * * *", async () => {
  console.log("🔔 Running 4-hour reminder check...");

  const now = new Date();

  const documents = await Document.find().populate("client");

  for (let doc of documents) {
    if (!doc.expiryDate || !doc.client || !doc.client.email) continue;

    const expiry = new Date(doc.expiryDate);
    const twoDaysBefore = new Date(expiry.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before

    // Only remind between (expiry - 2 days) and expiry
    if (now >= twoDaysBefore && now <= expiry) {
      const lastReminder = doc.reminderHistory?.slice(-1)[0]?.sentAt;
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      // If no reminder or last one was more than 4 hours ago
      if (!lastReminder || new Date(lastReminder) <= fourHoursAgo) {
        const message = `Hello ${doc.client.name},\n\nThis is a reminder that your document "${doc.name}" is expiring on ${expiry.toDateString()}.\n\nPlease take action before expiry.`;

        try {
          await sendEmail(doc.client.email, "⏰ Document Expiry Reminder", message);
          console.log(`📧 Sent reminder to ${doc.client.email} for "${doc.name}"`);

          doc.reminderHistory.push({ sentAt: now });
          await doc.save();
        } catch (err) {
          console.error(`❌ Failed to send reminder for ${doc.name}:`, err.message);
        }
      }
    }
  }
});
