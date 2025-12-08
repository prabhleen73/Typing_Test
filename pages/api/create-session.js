import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { studentId, expiresInMs } = req.body;

  try {
    const session = await convex.mutation(api.sessions.createSession, {
      studentId,
      expiresInMs,
    });

    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }

  
}
