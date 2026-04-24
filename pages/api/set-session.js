// pages/api/set-session.js
export default function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { token, expiresAt } = req.body || {};

  if (!token) return res.status(400).json({ error: "Missing token" });

  const safeExpiresAt = expiresAt ?? Date.now() + 60 * 60 * 1000; // fallback

  const expiryDate = new Date(safeExpiresAt).toUTCString();
  const maxAge = Math.floor((safeExpiresAt - Date.now()) / 1000);
  const safeMaxAge = Math.max(0, maxAge);
  const cookie = [
    `session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${safeMaxAge}`,
    `Expires=${expiryDate}`,
  ].join("; ");

  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ success: true });
}
