const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || 'noreply@sparkwash.com',
      to, subject, html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email failed to ${to}`, { error: err.message });
    throw err;
  }
}

exports.sendBookingConfirmation = (to, { name, package: pkg, date, time, price }) =>
  sendMail(to, '✅ Booking Confirmed — SparkWash', `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h2 style="color:#6c63ff">✦ SparkWash</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your booking has been received and is <strong>pending approval</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Package</td><td style="padding:8px"><strong>${pkg}</strong></td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Date</td><td style="padding:8px"><strong>${date}</strong></td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Time</td><td style="padding:8px"><strong>${time}</strong></td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Estimated Price</td><td style="padding:8px"><strong>₹${price}</strong></td></tr>
      </table>
      <p style="color:#666;font-size:13px">We'll notify you once your booking is approved. Thank you for choosing SparkWash!</p>
    </div>
  `);

exports.sendInvoice = (to, { name, txnId, package: pkg, amount, method, earnedPoints }) =>
  sendMail(to, `🧾 Invoice #${txnId} — SparkWash`, `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h2 style="color:#6c63ff">✦ SparkWash — Invoice</h2>
      <p>Hi <strong>${name}</strong>, thank you for your payment!</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Invoice #</td><td style="padding:8px"><strong>${txnId}</strong></td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Service</td><td style="padding:8px">${pkg}</td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Amount Paid</td><td style="padding:8px"><strong style="color:#22c55e">₹${amount}</strong></td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Payment Method</td><td style="padding:8px" style="text-transform:uppercase">${method}</td></tr>
        <tr><td style="padding:8px;background:#f9f9f9;color:#666">Points Earned</td><td style="padding:8px"><strong style="color:#6c63ff">+${earnedPoints} pts</strong></td></tr>
      </table>
      <p style="color:#666;font-size:13px">See you next time at SparkWash! 🚗</p>
    </div>
  `);

exports.sendFollowUp = (to, { name, daysSince }) =>
  sendMail(to, '🚗 We miss your car! — SparkWash', `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px">
      <h2 style="color:#6c63ff">✦ SparkWash</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>It's been <strong>${daysSince} days</strong> since your last wash. Your car deserves some love! 🚿</p>
      <p>Book your next appointment at <a href="${process.env.CLIENT_URL}/booking" style="color:#6c63ff">SparkWash Online Booking</a></p>
      <p style="color:#666;font-size:13px">Thank you for being a loyal SparkWash customer!</p>
    </div>
  `);
