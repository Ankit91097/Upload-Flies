const express = require("express");
const router = express.Router();
const { uploadDocument, getDocuments, updateDocument, deleteDocument } = require("../controllers/documentController");
const auth = require("../middlewares/auth");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

router.post("/upload-document", auth, upload.single("file"), uploadDocument);
router.get("/documents", auth, getDocuments);
router.put("/documents/:id", auth, updateDocument);
router.delete("/documents/:id", auth, deleteDocument);

module.exports = router;
