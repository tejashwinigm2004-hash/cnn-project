const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async (toEmail, userName) => {
  const mailOptions = {
    from: `"CNN Farm Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Welcome to CNN Farm Hub! 🌿",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        
        <h2 style="color: #2e7d32;">Welcome to CNN Farm Hub, ${userName}! 🌿</h2>
        
        <p style="color: #555;">Thank you for joining us! We're so happy to have you.</p>
        
        <p style="color: #555;">At CNN Farm Hub, we deliver <strong>fresh, organic farm products</strong> straight from our farm to your doorstep — milk, ghee, and more.</p>

        <a href="https://cnnfarmhub.com/products" 
           style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Browse Our Products
        </a>

        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />

        <p style="color: #aaa; font-size: 12px;">CNN Farm Hub | Fresh from our farm, daily.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendWelcomeEmail };