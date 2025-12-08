// pages/api/set-session.js
export default function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { token, expiresAt } = req.body || {};
  if (!token || !expiresAt)
    return res.status(400).json({ error: "Missing token or expiry" });

  const expiryDate = new Date(expiresAt).toUTCString();
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);

  // ❌ IMPORTANT FIX: remove "Secure;" completely (breaks cookies on IP + HTTP)
  const deleteOld = [
    "session=;",
    "Path=/;",
    "HttpOnly;",
    "SameSite=Lax;",
    "Max-Age=0;",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT;"
  ].join(" ");

  const newCookie = [
    `session=${encodeURIComponent(token)};`,
    "Path=/;",
    "HttpOnly;",
    "SameSite=Lax;",
    `Max-Age=${maxAge};`,
    `Expires=${expiryDate};`
  ].join(" ");

  res.setHeader("Set-Cookie", [deleteOld, newCookie]);
  return res.status(200).json({ success: true });
}
