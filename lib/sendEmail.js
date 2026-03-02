import nodemailer from "nodemailer";

export async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}