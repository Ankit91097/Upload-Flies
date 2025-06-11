const express = require("express");
const router = express.Router();
const { sendManualReminder } = require("../controllers/notificationController");
const auth = require("../middlewares/auth");

router.post("/send-reminder", auth, sendManualReminder);

module.exports = router;
