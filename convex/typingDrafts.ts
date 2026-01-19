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

    const existing = await ctx.db
      .query("typingTestDrafts")
      .withIndex("by_student_session", (q) =>
        q.eq("studentId", args.studentId).eq("sessionId", args.sessionId)
      )
      .unique();

    // If already submitted -> don't allow autosave
    if (existing?.isSubmitted) return;

    if (existing) {
      await ctx.db.patch(existing._id, {
        paragraphId: args.paragraphId,
        typedText: args.typedText,
        started: args.started,
        duration: args.duration,

        remainingSeconds: args.remainingSeconds, // 
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

        remainingSeconds: args.remainingSeconds, // 
        isSubmitted: false,
        updatedAt: now,
      });
    }
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
