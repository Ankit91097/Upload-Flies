const s3 = require("../config/aws");
const Document = require("../models/Document");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");


exports.uploadDocument = async (req, res) => {
  try {
    const { name, type, description, expiryDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }
    console.log(req.file)
    const localFile = req.file.path;
    const fileStream = fs.createReadStream(localFile);
    const fileExtension = path.extname(req.file.originalname);
    const s3Key = `documents/${Date.now()}-${uuidv4()}${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentType: req.file.mimetype,
      ACL: "public-read", // Required for access
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log("👉 File URL:", fileUrl); // 🧪 DEBUG

    // Delete temp file
    try {
      fs.unlinkSync(localFile);
      console.log("✅ Temp file deleted:", localFile);
    } catch (err) {
      console.error("❌ Failed to delete local file:", err.message);
    }

    // Save to DB
    const doc = await Document.create({
      client: req.user.id,
      name,
      type,
      description,
      expiryDate,
      fileUrl,
    });

    res.status(201).json({ msg: "Uploaded successfully", document: doc });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({
      msg: "Upload failed",
      error: err.message || "Something went wrong",
    });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { client: req.user.id };
    const docs = await Document.find(query).populate("client", "name email");
    res.json(docs);
  } catch (err) {
    res
      .status(500)
      .json({ msg: "Error fetching documents", error: err.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ msg: "Document not found" });

    let newFileUrl = document.fileUrl;

    // Step 1: Check if expiry date changed
    if (
      req.body.expiryDate &&
      new Date(req.body.expiryDate).toISOString() !==
        document.expiryDate.toISOString()
    ) {
      document.reminderHistory = []; // Clear reminder history
      console.log("🕒 Expiry date changed — cleared reminder history.");
      await document.save();
    }

    // If file is provided in update request
    if (req.file) {
      // Step 1: DELETE OLD FILE FROM S3
      const oldKey = decodeURIComponent(document.fileUrl.split(".com/")[1]);
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: oldKey,
      };
      await s3.send(new DeleteObjectCommand(deleteParams));

      // Step 2: UPLOAD NEW FILE TO S3
      const localFile = req.file.path;
      const fileStream = fs.createReadStream(localFile);
      const fileExtension = path.extname(req.file.originalname);
      const newS3Key = `documents/${Date.now()}-${uuidv4()}${fileExtension}`;

      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: newS3Key,
        Body: fileStream,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(uploadParams));
      try {
        fs.unlinkSync(localFile);
        console.log("Temp file deleted:", localFile);
      } catch (err) {
        console.error("Failed to delete local file:", err.message);
      }

      // Step 3: Build new public URL
      newFileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newS3Key}`;
    }

    // Step 4: Update document in DB
    const updatedDoc = await Document.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        fileUrl: newFileUrl,
      },
      { new: true }
    );

    res.json({ msg: "Document updated successfully", document: updatedDoc });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      msg: "Update failed",
      error:
        typeof err === "object" ? JSON.stringify(err, null, 2) : err.message,
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    // Step 1: Find the document
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ msg: "Document not found" });
    }

    // Step 2: Delete file from S3 if it exists
    if (document.fileUrl) {
      try {
        // ✅ Extract correct file key from URL
        const url = new URL(document.fileUrl);
        const fileKey = decodeURIComponent(url.pathname.substring(1)); // removes the starting "/"

        const deleteParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileKey,
        };

        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log("🗑️ Deleted file from S3:", fileKey);
      } catch (s3Err) {
        console.error("❌ Failed to delete from S3:", s3Err.message);
        // Proceed anyway — file might already be gone
      }
    }

    // Step 3: Delete document from MongoDB
    await Document.findByIdAndDelete(req.params.id);
    console.log("🗃️ Document deleted from DB:", req.params.id);

    res.json({ msg: "Document and file deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      msg: "Delete failed",
      error:
        typeof err === "object" ? JSON.stringify(err, null, 2) : err.message,
    });
  }
};

exports.getSingleDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select("+fileUrl");
    if (!doc) {
      return res.status(404).json({ msg: "Document not found" });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
