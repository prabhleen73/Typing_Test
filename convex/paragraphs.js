import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Character validation
const VALID_CHAR_REGEX = /^[\x20-\x7E]+$/;

function validateParagraphText(text) {
  const invalidChars = [];
  for (const char of text) {
    if (!VALID_CHAR_REGEX.test(char)) {
      invalidChars.push(char);
    }
  }
  return {
    valid: invalidChars.length === 0,
    invalidChars: [...new Set(invalidChars)],
  };
}

//verify super admin

async function requireSuperAdmin(ctx, token) {
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Unauthorized");
  }

  const admin = await ctx.db.get(session.adminId);

  if (!admin || admin.role !== "super_admin") {
    throw new Error("Only Super Admin allowed");
  }

  return admin;
}


export const addParagraph = mutation({
  args: {
    content: v.string(),
    sessionId: v.id("testSessions"),
    token: v.string(),
  },
  handler: async (ctx, args) => {

    // ===============================
    // 1️⃣ Validate admin session
    // ===============================
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized");
    }

    const admin = await ctx.db.get(session.adminId);

    if (!admin) {
      throw new Error("Unauthorized");
    }

    // ===============================
    // Validate text
    // ===============================
    const result = validateParagraphText(args.content);
    if (!result.valid) {
      throw new Error(
        "Invalid characters found: " + result.invalidChars.join(" ")
      );
    }

    // ===============================
    // 3️⃣ Get session name
    // ===============================
    const sessionData = await ctx.db.get(args.sessionId);

    if (!sessionData) {
      throw new Error("Session not found");
    }

    // ===============================
    // 4️⃣ Check existing paragraph
    // ===============================
    const existing = await ctx.db
      .query("paragraphs")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .unique();

    // ===============================
    //  SUPER ADMIN
    // ===============================
    if (admin.role === "super_admin") {

      if (existing) {
        await ctx.db.delete(existing._id);
      }

      return await ctx.db.insert("paragraphs", {
        content: args.content.trim(),
        sessionId: args.sessionId,
        sessionName: sessionData.name,   
        updatedAt: Date.now(),
        isLocked: true,
      });
    }

    // ===============================
    //  NORMAL ADMIN
    // ===============================
    if (admin.role === "admin") {

      if (existing) {
        throw new Error(
          "Paragraph already exists for this session. Contact Super Admin."
        );
      }

      return await ctx.db.insert("paragraphs", {
        content: args.content.trim(),
        sessionId: args.sessionId,
        sessionName: sessionData.name,   
        updatedAt: Date.now(),
        isLocked: true,
      });
    }

    throw new Error("Unauthorized");
  },
});

//delete paragraph
export const deleteParagraph = mutation({
  args: {
    id: v.id("paragraphs"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);

    await ctx.db.delete(args.id);
  },
});


//get all paragraphs-admin
export const getAllParagraphs = query({
  handler: async (ctx) => {
    return await ctx.db.query("paragraphs").collect();
  },
});

//get paragraph (student test)

export const getParagraph = query({
  args: {
    sessionId: v.id("testSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paragraphs")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .unique();
  },
});

export const updateParagraph = mutation({
  args: {
    id: v.id("paragraphs"),
    content: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);

    const paragraph = await ctx.db.get(args.id);
    if (!paragraph) {
      throw new Error("Paragraph not found");
    }

    const result = validateParagraphText(args.content);
    if (!result.valid) {
      throw new Error(
        "Invalid characters found: " + result.invalidChars.join(" ")
      );
    }

    await ctx.db.patch(args.id, {
      content: args.content.trim(),
      updatedAt: Date.now(),
    });
  },
});