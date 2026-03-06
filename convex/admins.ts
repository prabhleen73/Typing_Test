import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

// SUPER ADMIN CREATES ADMIN

export const createAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {

    // Verify super_admin session
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

    // Check existing admin
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      return {
        success: false,
        message: "Admin with this email already exists.",
      };
    }

    const username = args.email.split("@")[0];
    const password = Math.random().toString(36).slice(-8);

    // HASH PASSWORD (SYNC version allowed in Convex)
    const hashedPassword = bcrypt.hashSync(password, 10);

    await ctx.db.insert("admins", {
      name: args.name,
      email: args.email,
      username,
      password: hashedPassword,
      role: "admin",
      createdAt: Date.now(),
    });

    return {
      success: true,
      username,
      password, // send plain password only for email
    };
  },
});


// LOGIN ADMIN

export const loginAdmin = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!admin) {
      return {
        success: false,
        message: "User not found",
      };
    }

    let validPassword = false;

    if (admin.role === "super_admin") {
      // super_admin password stored as plain text
      validPassword = admin.password === args.password;
    } else {
      // admin password hashed
      validPassword = bcrypt.compareSync(
        args.password,
        admin.password
      );
    }

    if (!validPassword) {
      return {
        success: false,
        message: "Wrong password",
      };
    }

    // Generate session token
    const token = crypto.randomUUID();

    await ctx.db.insert("adminSessions", {
      adminId: admin._id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 4, // 4 hours
    });

    return {
      success: true,
      token,
      username: admin.username,
      role: admin.role,
      email: admin.email,
    };
  },
});