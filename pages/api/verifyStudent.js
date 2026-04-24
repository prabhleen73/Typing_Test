import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";

function sanitizeCredential(value) {
  return value
    ?.toString()
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

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

  const username = sanitizeCredential(req.body?.username);
  const password = sanitizeCredential(req.body?.password);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  try {
    const convexUrl = getConvexUrl();
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.mutation("student:verifyStudent", {
      username,
      password,
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}
