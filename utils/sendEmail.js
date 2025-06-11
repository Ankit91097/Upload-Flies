const nodemailer = require("nodemailer");

const sendEmail = async (email,text,otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465, // or "hotmail", or use `host` & `port` for custom SMTP
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "Whitecircle Group",
    to:email,
    subject:"Reset Password",
    html:`<h1>Your OTP is ${otp}</h1>`,
    text:otp,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
