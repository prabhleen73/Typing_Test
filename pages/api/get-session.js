export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const cookieHeader = req.headers.cookie || "";

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("session="));

  if (!match) return res.status(200).json({ token: null });

  const token = match.replace("session=", "").replace(/^"|"$/g, "");

  res.status(200).json({ token });
}
