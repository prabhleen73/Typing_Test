import { mutation } from "./_generated/server";
import { v } from "convex/values";

/* =========================
   SUPER ADMIN CREATES ADMIN
========================= */

export const createAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email)
      )
      .unique();

    if (existing) {
      throw new Error("Admin with this email already exists");
    }

    // Generate username from email
    const username = args.email;

    // Generate random password
    const password = Math.random().toString(36).slice(-8);

    await ctx.db.insert("admins", {
      name: args.name,
      email: args.email,
      username,
      password,
      role: "admin",
      createdAt: Date.now(),
    });

    return {
      username,
      password, // send back so super admin can share
    };
  },
});

/* =========================
   LOGIN ADMIN
========================= */

export const loginAdmin = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_username", (q) =>
        q.eq("username", args.username)
      )
      .unique();

    if (!admin) {
      throw new Error("User not found");
    }

    if (admin.password !== args.password) {
      throw new Error("Wrong password");
    }

    return {
      token: "secure-token-" + admin.username,
      username: admin.username,
      role: admin.role,
    };
  },
});