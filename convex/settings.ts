import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateTestSettings = mutation({
  args: {
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
    postName: v.string(),
    examDate: v.number(), // timestamp
    qualifyingWpm: v.number(),
    qualifyingKdph: v.number(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("testSettings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionId: args.sessionId,
        sessionName: args.sessionName,
        postName: args.postName,
        examDate: args.examDate,
        qualifyingWpm: args.qualifyingWpm,
        qualifyingKdph: args.qualifyingKdph,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("testSettings", {
        sessionId: args.sessionId,
        sessionName: args.sessionName,
        postName: args.postName,
        examDate: args.examDate,
        qualifyingWpm: args.qualifyingWpm,
        qualifyingKdph: args.qualifyingKdph,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getTestSettings = query({
  args: {
    sessionId: v.id("testSessions"),
  },

  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("testSettings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    return settings || null;
  },
});