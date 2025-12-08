// convex/results.js

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Check if student already attempted
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

// Save result
export const saveResult = mutation({
  args: {
    studentId: v.string(),
    paragraphId: v.id("paragraphs"),
    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    text: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { studentId, paragraphId } = args;

    // ✅ FIX 1 — reject invalid payload (prevents crashes)
    if (!studentId || !paragraphId) {
      return { success: false, message: "Invalid result payload." };
    }

    // Block repeated attempts
    const existing = await ctx.db
      .query("results")
      .withIndex("by_student", (q) => q.eq("studentId", studentId))
      .filter((q) => q.eq(q.field("paragraphId"), paragraphId))
      .first();

    if (existing) {
      return { success: false, message: "Attempt blocked: Already attempted." };
    }

    const paragraph = await ctx.db.get(paragraphId);

    // ✅ FIX 2 — paragraph not found safety
    if (!paragraph) {
      return { success: false, message: "Paragraph not found." };
    }

    const paragraphContent = paragraph.content ?? "";
    const originalSymbols = paragraphContent.length;

    const result = await ctx.db.insert("results", {
      studentId,
      paragraphId,
      symbols: args.symbols,
      seconds: args.seconds,
      accuracy: args.accuracy,
      wpm: args.wpm,
      text: args.text ?? "",
      paragraphContent,
      originalSymbols,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, result };
  },
});

// Get all results - admin
export const getAllResults = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("results")
      .withIndex("by_submittedAt")
      .order("desc")
      .collect();
  },
});
