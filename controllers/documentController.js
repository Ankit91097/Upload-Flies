const s3 = require("../config/aws");
const Document = require("../models/Document");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

exports.uploadDocument = async (req, res) => {
  try {
    const { name, type, description, expiryDate } = req.body;
    const localFile = req.file.path;
    const fileStream = fs.createReadStream(localFile);
    const fileExtension = path.extname(req.file.originalname);
    const s3Key = `documents/${Date.now()}-${uuidv4()}${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentType: req.file.mimetype,
    };

    const data = await s3.upload(uploadParams).promise();
    try {
      fs.unlinkSync(localFile);
      console.log("Temp file deleted:", localFile);
    } catch (err) {
      console.error("Temp file not deleted:", err.message);
    }

    const doc = await Document.create({
      client: req.user.id,
      name,
      type,
      description,
      expiryDate,
      fileUrl: data.Location,
    });

    res.status(201).json({ msg: "Uploaded to S3", document: doc });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({
      msg: "Upload error",
      error:
        typeof err === "object" ? JSON.stringify(err, null, 2) : err.message,
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
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ msg: "Document not found" });

    // 🔥 Step 1: Delete from S3
    if (document.fileUrl) {
      const fileKey = decodeURIComponent(document.fileUrl.split(".com/")[1]);

      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
      };

      await s3.send(new DeleteObjectCommand(deleteParams));
      console.log("Deleted file from S3:", fileKey);
    }

    // 🗑️ Step 2: Delete from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.json({ msg: "Document and file deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      msg: "Delete failed",
      error: typeof err === "object" ? JSON.stringify(err, null, 2) : err.message,
    });
  }
};
