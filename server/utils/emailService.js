const nodemailer = require("nodemailer");
const dns = require("dns");
 
// Force IPv4 first — on some hosts (e.g. Render), Node tries Gmail's IPv6
// address first and it's unreachable, causing ENETUNREACH errors even
// though credentials are correct. Preferring IPv4 avoids that entirely.
dns.setDefaultResultOrder("ipv4first");
 
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for port 465
  family: 4, // force IPv4 explicitly — dns.setDefaultResultOrder alone isn't
             // enough on some hosts (e.g. Render), since nodemailer's socket
             // connection can bypass Node's global DNS default order.
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
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.response);
  } catch (err) {
    console.error("Email error:", err.message);
  }
};
 
const sendOrderConfirmationEmail = async (toEmail, userName, order) => {
  const itemsList = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">₹${item.price}</td>
    </tr>
  `).join('');
 
  const mailOptions = {
    from: `"CNN Farm Hub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Order Confirmed! 🛒 CNN Farm Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2e7d32;">Order Confirmed! 🎉</h2>
        <p style="color: #555;">Hi ${userName}, your order has been placed successfully!</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 8px; text-align: left;">Product</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsList}</tbody>
        </table>
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
          <strong>Total Amount: ₹${order.totalAmount}</strong>
        </div>
        <p style="color: #555; margin-top: 20px;">We'll deliver your order fresh every morning! 🥛</p>
        <a href="https://cnnfarmhub.com/orders" 
           style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #2e7d32; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Track Your Order
        </a>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
        <p style="color: #aaa; font-size: 12px;">CNN Farm Hub | Fresh from our farm, daily.</p>
      </div>
    `,
  };
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent:", result.response);
  } catch (err) {
    console.error("Order email error:", err.message);
  }
};
 
const sendBookingNotificationEmail = async (booking) => {
  const mailOptions = {
    from: `"CNN Farm Hub" <${process.env.EMAIL_USER}>`,
    to: "cnnfarmhub@gmail.com",
    subject: `New Discovery Call Booking — ${booking.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2e7d32;">New Call Booking Request 📞</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Time Slot</strong></td>
            <td style="padding: 8px;">${booking.timeSlot}</td>
          </tr>
        </table>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
        <p style="color: #aaa; font-size: 12px;">CNN Farm Hub | Booking System</p>
      </div>
    `,
  };
  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Booking notification email sent:", result.response);
  } catch (err) {
    console.error("Booking email error:", err.message);
  }
};
 
module.exports = { sendWelcomeEmail, sendOrderConfirmationEmail, sendBookingNotificationEmail };