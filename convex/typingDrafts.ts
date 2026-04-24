import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get Draft (Resume test on any device)
 */
export const getDraft = query({
  args: {
    studentId: v.string(),
    sessionId: v.id("testSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("typingTestDrafts")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .unique();
  },
});

/**
 * Save Draft (autosave progress)  PAUSE TIMER SYSTEM
 */
export const saveDraft = mutation({
  args: {
    token: v.string(),
    studentId: v.string(),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),

    typedText: v.string(),
    started: v.boolean(),

    duration: v.number(),

    remainingSeconds: v.number(), // 
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session) {
      return { success: false, reason: "invalid_session" };
    }

    if (session.studentId !== args.studentId) {
      return { success: false, reason: "student_mismatch" };
    }

    const serverRemaining =
      typeof session.testEndsAt === "number"
        ? Math.max(0, Math.ceil((session.testEndsAt - now) / 1000))
        : Math.max(0, args.remainingSeconds);
    const serverTestEndsAt =
      typeof session.testEndsAt === "number" ? session.testEndsAt : undefined;

    const existing = await ctx.db
      .query("typingTestDrafts")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .unique();

    // If already submitted -> don't allow autosave
    if (existing?.isSubmitted) return { success: false, reason: "submitted" };

    if (existing) {
      await ctx.db.patch(existing._id, {
        paragraphId: args.paragraphId,
        typedText: args.typedText,
        started: args.started,
        duration: args.duration,

        remainingSeconds: serverRemaining,
        testEndsAt: serverTestEndsAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("typingTestDrafts", {
        studentId: args.studentId,
        sessionId: args.sessionId,
        paragraphId: args.paragraphId,

        typedText: args.typedText,
        started: args.started,
        duration: args.duration,

        remainingSeconds: serverRemaining,
        testEndsAt: serverTestEndsAt,
        isSubmitted: false,
        updatedAt: now,
      });
    }

    return {
      success: true,
      remainingSeconds: serverRemaining,
      testEndsAt: serverTestEndsAt ?? null,
    };
  },
});

/**
 * Mark Submitted (Lock draft forever after final submit)
 */
export const markSubmitted = mutation({
  args: {
    studentId: v.string(),
    sessionId: v.id("testSessions"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingTestDrafts")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .unique();

    if (!existing) return;

    await ctx.db.patch(existing._id, {
      isSubmitted: true,
      updatedAt: Date.now(),
    });
  },
});

export const resetDraft = mutation({
  args: {
    studentId: v.string(),
    sessionId: v.id("testSessions"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingTestDrafts")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .unique();

    if (!existing) {
      return { success: true };
    }

    await ctx.db.delete(existing._id);
    return { success: true };
  },
});
