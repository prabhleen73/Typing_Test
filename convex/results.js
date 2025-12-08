import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ✅ Check if student already attempted
export const hasAttempted = query({
  args: {
    studentId: v.string(),
    paragraphId: v.id("paragraphs"),
  },

  handler: async (ctx, { studentId, paragraphId }) => {
    const existing = await ctx.db
      .query("results")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .filter((q) => q.eq(q.field("paragraphId"), paragraphId))
      .first();

    return !!existing;
  },
});

// ✅ Save Result (BULLETPROOF)
export const saveResult = mutation({
  args: {
    studentId: v.string(),
    sessionId: v.string(), // ✅ STRING to match frontend
    paragraphId: v.id("paragraphs"),
    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    text: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    if (!args.studentId || !args.paragraphId || !args.sessionId) {
      return { success: false, message: "Missing required fields" };
    }

    const existing = await ctx.db
      .query("results")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("paragraphId"), args.paragraphId))
      .first();

    if (existing) {
      return { success: false, message: "Already attempted" };
    }

    const paragraph = await ctx.db.get(args.paragraphId);
    if (!paragraph) {
      return { success: false, message: "Paragraph not found" };
    }

    const paragraphContent = paragraph.content ?? "";
    const originalSymbols = paragraphContent.length;

    await ctx.db.insert("results", {
      studentId: args.studentId,
      sessionId: args.sessionId, // ✅ GUARANTEED SAFE
      paragraphId: args.paragraphId,
      symbols: args.symbols,
      seconds: args.seconds,
      accuracy: args.accuracy,
      wpm: args.wpm,
      text: args.text ?? "",
      paragraphContent,
      originalSymbols,
      submittedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ✅ Get all results - admin
export const getAllResults = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("results")
      .withIndex("by_submittedAt")
      .order("desc")
      .collect();
  },
});

// ✅ Get results by session
export const getResultsBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("results")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
  },
});
