import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

//  Generate a strong session token (Convex-safe)
function randomToken() {
  //  crypto.randomUUID() is available in Convex runtime
  return `${crypto.randomUUID()}_${crypto.randomUUID()}_${Date.now()}`;
}

// Create session after login
export const createSession = mutation({
  args: {
    studentId: v.string(),
    expiresInMs: v.number(),
  },

  handler: async (ctx, { studentId, expiresInMs }) => {
    const token = randomToken();
    const expiresAt = Date.now() + expiresInMs;

    await ctx.db.insert("sessions", {
      studentId,
      token,
      expiresAt,
      testActive: false,
    });

    return { token, expiresAt };
  },
});

// Validate session
export const validateSession = query({
  args: { token: v.string() },

  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) return { valid: false };
    if (session.expiresAt < Date.now()) return { valid: false };

    return {
      valid: true,
      studentId: session.studentId,
      testActive: session.testActive ?? false,
    };
  },
});

// Update testActive (start/stop test)
export const updateTestActive = mutation({
  args: {
    token: v.string(),
    active: v.boolean(),
  },

  handler: async (ctx, { token, active }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session) return { success: false };

    await ctx.db.patch(session._id, { testActive: active });

    return { success: true };
  },
});

// Delete all sessions for a student (logout cleanup)
export const deleteOldSessions = mutation({
  args: { studentId: v.string() },

  handler: async (ctx, { studentId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
      .collect();

    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    return { deleted: sessions.length };
  },
});

// Delete one session (normal logout)
export const deleteSession = mutation({
  args: { token: v.string() },

  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (session) await ctx.db.delete(session._id);

    return { success: true };
  },
});
