import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTimeSetting = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db.query("timeSettings").first();

    // default = 60 seconds
    if (!setting) {
      return { duration: 60 };
    }

    return setting; // return seconds
  },
});

export const updateTimeSetting = mutation({
  args: {
    duration: v.number(), // UI sends minutes
  },
  handler: async (ctx, args) => {

    // convert minutes → seconds
    const durationSeconds = args.duration * 60;

    const existing = await ctx.db.query("timeSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        duration: durationSeconds,
      });
    } else {
      await ctx.db.insert("timeSettings", {
        duration: durationSeconds,
      });
    }
  },
});