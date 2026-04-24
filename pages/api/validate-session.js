import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";

function getConvexUrl() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("NEXT_PUBLIC_CONVEX_URL="));

    const fileUrl = line?.split("=")[1]?.trim();
    if (fileUrl) return fileUrl;
  }

  return process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const token = req.body?.token?.toString().trim();
  if (!token) {
    return res.status(400).json({ success: false, message: "Missing token" });
  }

  try {
    const convex = new ConvexHttpClient(getConvexUrl());
    const session = await convex.query("sessions:validateSession", { token });
    return res.status(200).json(session);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
