
const Document = require("../models/Document");
const bucket = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

exports.uploadDocument = async (req, res) => {
  try {
    const { name, type, description, expiryDate } = req.body;
    const localFile = req.file.path;

    const destination = `documents/${Date.now()}-${req.file.originalname}`;
    const token = uuidv4();

    const uploaded = await bucket.upload(localFile, {
      destination,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      }
    });

    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
    
    fs.unlinkSync(localFile); // delete local temp file

    const doc = await Document.create({
      client: req.user.id,
      name,
      type,
      description,
      expiryDate,
      fileUrl
    });

    res.status(201).json({ msg: "Uploaded to Firebase", document: doc });
  } catch (err) {
    res.status(500).json({ msg: "Upload error", error: err.message });
  }
};



exports.getDocuments = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { client: req.user.id };
    const docs = await Document.find(query).populate("client", "name email");
    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching documents", error: err.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const updated = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ msg: "Updated", document: updated });
  } catch (err) {
    res.status(500).json({ msg: "Update failed", error: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed", error: err.message });
  }
};
