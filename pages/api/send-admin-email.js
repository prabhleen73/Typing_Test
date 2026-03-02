import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, username, password } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Your Admin Account Credentials",
      html: `
        <h2>Your Admin Account</h2>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>
      `,
    });

    console.log("EMAIL SENT:", info.response);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    return res.status(500).json({ error: "Email failed" });
  }
}