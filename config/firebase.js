const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "firebaseServiceKey.json")); // <- Put your JSON key here

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
   storageBucket: "upload-doc-7b1c5.firebasestorage.app", // <- Your Firebase bucket
});

const bucket = admin.storage().bucket();
module.exports = bucket;
