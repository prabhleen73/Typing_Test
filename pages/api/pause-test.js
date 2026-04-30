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
    return res.status(405).json({ success: false });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ success: false, message: "Invalid body" });
    }
  }

  const token = body?.token?.toString().trim();
  const studentId = body?.studentId?.toString().trim();
  const sessionId = body?.sessionId?.toString().trim();
  const paragraphId = body?.paragraphId?.toString().trim();
  const typedText = typeof body?.typedText === "string" ? body.typedText : "";
  const started = body?.started === true;
  const duration = Number(body?.duration || 0);
  const remainingSeconds = Number(body?.remainingSeconds || 0);

  if (!token || !studentId || !sessionId || !paragraphId) {
    return res.status(400).json({ success: false, message: "Missing test state" });
  }

  try {
    const convex = new ConvexHttpClient(getConvexUrl());
    const result = await convex.mutation("typingDrafts:pauseAndSaveDraft", {
      token,
      studentId,
      sessionId,
      paragraphId,
      typedText,
      started,
      duration,
      remainingSeconds,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
