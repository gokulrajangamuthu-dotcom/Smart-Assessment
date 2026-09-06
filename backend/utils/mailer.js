import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Uses Gmail SMTP. EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env.
// EMAIL_APP_PASSWORD is a Gmail "App Password" (NOT your normal Gmail password) —
// see the setup guide for how to generate one.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(toEmail, studentName, otp) {
  await transporter.sendMail({
    from: `"SmartAssess" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'SmartAssess - Password Reset Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1F4E78;">SmartAssess</h2>
        <p>Hi ${studentName || 'there'},</p>
        <p>You requested to reset your password. Use the code below to continue:</p>
        <div style="background: #f0f4f8; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1F4E78;">${otp}</span>
        </div>
        <p>This code expires in <b>10 minutes</b>. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">SmartAssess - Weekly Aptitude Assessment Platform</p>
      </div>
    `,
  });
}
