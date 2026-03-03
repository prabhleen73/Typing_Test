import { mutation } from "./_generated/server";
import { v } from "convex/values";

//superadmin creates admin

export const createAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    token: v.string(), // super_admin token required
  },
  handler: async (ctx, args) => {

    // Verify super_admin
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }

    const adminUser = await ctx.db.get(session.adminId);

    if (!adminUser || adminUser.role !== "super_admin") {
      throw new Error("Only Super Admin can create admins");
    }

    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email)
      )
      .unique();

    if (existing) {
      throw new Error("Admin with this email already exists");
    }

    const username = args.email.split("@")[0];
    const password = Math.random().toString(36).slice(-8);

    await ctx.db.insert("admins", {
      name: args.name,
      email: args.email,
      username,
      password, 
      role: "admin",
      createdAt: Date.now(),
    });

    return { username, password };
  },
});

//Login Admin

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

    //  Generate secure random token
    const token = crypto.randomUUID();

    //  Store session in DB
    await ctx.db.insert("adminSessions", {
      adminId: admin._id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 4, // 4 hours
    });

    return {
      token,
      username: admin.username,
      role: admin.role,
    };
  },
});