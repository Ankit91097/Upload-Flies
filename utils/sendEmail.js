const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, message) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Whitecircle Group" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>${subject}</h2>
        <p>${message}</p>
      </div>
    `,
    text: message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;

