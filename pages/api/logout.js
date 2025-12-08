// pages/api/logout.js
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Read cookie to delete Convex session
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="));

  if (match) {
    const raw = match.substring("session=".length);
    const token = decodeURIComponent(raw).replace(/^"|"$/g, "").trim();
    try {
      await convex.mutation("sessions.deleteSession", { token });
    } catch (e) {
      console.error("Error deleting convex session", e);
    }
  }

  // DELETE COOKIE (must include Domain)
  res.setHeader(
    "Set-Cookie",
    "session=; Path=/; Domain=10.40.113.16; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );

  return res.status(200).json({ success: true });
}
