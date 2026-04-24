import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, username, password } = req.body;

  const testLink = "http://localhost:3000/admin/admin-login";

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
      subject: "Test Admin Login Credentials",
      html: `
        <h2>Test Admin Access</h2>

        <p>You can access the <strong>Test Admin Panel</strong> using the following details:</p>

        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>

        <p><strong>Test Admin Link:</strong></p>

        <a href="${testLink}" 
        style="background:#007bff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
        Open Test Admin Panel
        </a>

        <br/><br/>
        <p>If the button does not work, use this link:</p>
        <p>${testLink}</p>
      `,
    });

    console.log("EMAIL SENT:", info.response);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    return res.status(500).json({ error: "Email failed" });
  }
}
