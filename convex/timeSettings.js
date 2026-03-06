import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTimeSetting = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db.query("timeSettings").first();

    if (!setting) {
      return { duration: 1 }; // default 1 minute
    }

    // convert seconds → minutes for UI
    return {
      ...setting,
      duration: setting.duration / 60,
    };
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