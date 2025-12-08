import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTestSession = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db.insert("testSessions", {
      name,
      createdAt: Date.now(),
    });
  },
});

export const getTestSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("testSessions").order("desc").collect();
  },
});
export const getSessionByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("testSessions")
      .filter((q) => q.eq("name", name))
      .first();
  },
});

