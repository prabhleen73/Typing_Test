import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

//  Generate a strong session token (Convex-safe)
function randomToken() {
  //  crypto.randomUUID() is available in Convex runtime
  return `${crypto.randomUUID()}_${crypto.randomUUID()}_${Date.now()}`;
}

function getRemainingSeconds(session, now = Date.now()) {
  if (typeof session.testEndsAt === "number") {
    return Math.max(0, Math.ceil((session.testEndsAt - now) / 1000));
  }

  if (typeof session.remainingSeconds === "number") {
    return Math.max(0, session.remainingSeconds);
  }

  return null;
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
      updatedAt: Date.now(),
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
      remainingSeconds: getRemainingSeconds(session),
      testStartedAt: session.testStartedAt ?? null,
      testEndsAt: session.testEndsAt ?? null,
    };
  },
});

// Update testActive (start/stop test)
export const updateTestActive = mutation({
  args: {
    token: v.string(),
    active: v.boolean(),
    duration: v.optional(v.number()),
    resumeRemainingSeconds: v.optional(v.number()),
  },

  handler: async (ctx, { token, active, duration, resumeRemainingSeconds }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session) return { success: false };

    const now = Date.now();
    const currentRemaining = getRemainingSeconds(session, now);

    if (active) {
      if (
        typeof resumeRemainingSeconds === "number" &&
        resumeRemainingSeconds >= 0
      ) {
        const anchoredRemaining = Math.max(0, Math.ceil(resumeRemainingSeconds));
        const testStartedAt =
          typeof session.testStartedAt === "number" ? session.testStartedAt : now;
        const testEndsAt = now + anchoredRemaining * 1000;

        await ctx.db.patch(session._id, {
          testActive: anchoredRemaining > 0,
          remainingSeconds: anchoredRemaining,
          testStartedAt,
          testEndsAt,
          updatedAt: now,
        });

        return {
          success: true,
          remainingSeconds: anchoredRemaining,
          testStartedAt,
          testEndsAt,
        };
      }

      if (
        typeof session.testStartedAt === "number" &&
        typeof session.testEndsAt === "number"
      ) {
        const stillRunning = currentRemaining > 0;

        await ctx.db.patch(session._id, {
          testActive: stillRunning,
          remainingSeconds: currentRemaining ?? 0,
          updatedAt: now,
        });

        return {
          success: true,
          remainingSeconds: currentRemaining ?? 0,
          testStartedAt: session.testStartedAt,
          testEndsAt: session.testEndsAt,
        };
      }

      if (typeof duration !== "number" || duration <= 0) {
        return { success: false, message: "Duration required to start test" };
      }

      const testStartedAt = now;
      const testEndsAt = now + duration * 1000;

      await ctx.db.patch(session._id, {
        testActive: true,
        remainingSeconds: duration,
        testStartedAt,
        testEndsAt,
        updatedAt: now,
      });

      return {
        success: true,
        remainingSeconds: duration,
        testStartedAt,
        testEndsAt,
      };
    }

    await ctx.db.patch(session._id, {
      testActive: false,
      remainingSeconds: currentRemaining ?? 0,
      updatedAt: now,
    });

    return { success: true, remainingSeconds: currentRemaining ?? 0 };
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

export const updateRemainingTime = mutation({
  args: {
    token: v.string(),
    remainingSeconds: v.number(),
  },

  handler: async (ctx, { token, remainingSeconds }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) return { success: false };

    const derivedRemaining = getRemainingSeconds(session);
    const safeClientRemaining = Math.max(0, remainingSeconds);
    const canonicalRemaining =
      typeof derivedRemaining === "number"
        ? Math.min(derivedRemaining, safeClientRemaining)
        : safeClientRemaining;

    await ctx.db.patch(session._id, {
      remainingSeconds: canonicalRemaining,
      updatedAt: Date.now(),
    });

    return { success: true, remainingSeconds: canonicalRemaining };
  },
});
