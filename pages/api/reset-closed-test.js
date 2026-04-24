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
  const studentId = req.body?.studentId?.toString().trim();
  const sessionId = req.body?.sessionId?.toString().trim();

  try {
    const convex = new ConvexHttpClient(getConvexUrl());

    if (token) {
      await convex.mutation("sessions:deleteSession", { token });
    }

    if (studentId && sessionId) {
      await convex.mutation("typingDrafts:resetDraft", { studentId, sessionId });
    }

    res.setHeader(
      "Set-Cookie",
      "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
