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

// ================= SUPER ADMIN CHECK =================
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

// ================= ADD PARAGRAPH =================
export const addParagraph = mutation({
  args: {
    content: v.string(),
    sessionId: v.id("testSessions"),
    token: v.string(),
  },
  handler: async (ctx, args) => {

    console.log("========== ADD PARAGRAPH START ==========");
    console.log("ARGS TOKEN:", args.token);

    // 🔥 Get session
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    console.log("SESSION FOUND:", session);

    if (!session) {
      throw new Error("No session found");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired");
    }

    // 🔥 Get admin
    const admin = await ctx.db.get(session.adminId);

    console.log("ADMIN:", admin);
    console.log("ROLE RAW:", JSON.stringify(admin?.role));

    if (!admin) {
      throw new Error("Admin not found");
    }

    // 🔥 Normalize role (IMPORTANT FIX)
    const role = admin.role?.trim().toLowerCase();
    console.log("NORMALIZED ROLE:", role);

    // ================= TEXT VALIDATION =================
    const content = args.content.trim();

    const result = validateParagraphText(content);
    if (!result.valid) {
      throw new Error(
        "Invalid characters found: " + result.invalidChars.join(" ")
      );
    }

    // ================= GET SESSION =================
    const sessionData = await ctx.db.get(args.sessionId);

    if (!sessionData) {
      throw new Error("Session not found");
    }

    // ================= CHECK EXISTING =================
    const existing = await ctx.db
      .query("paragraphs")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .unique();

    console.log("EXISTING PARAGRAPH:", existing);

    // ================= SUPER ADMIN =================
    if (role === "super_admin") {
      console.log("ROLE MATCH: SUPER ADMIN");

      if (existing) {
        await ctx.db.delete(existing._id);
      }

      return await ctx.db.insert("paragraphs", {
        content,
        sessionId: args.sessionId,
        sessionName: sessionData.name,
        updatedAt: Date.now(),
        isLocked: true,
      });
    }

    // ================= NORMAL ADMIN =================
    if (role === "admin") {
      console.log("ROLE MATCH: ADMIN");

      if (existing) {
        throw new Error(
          "Paragraph already exists for this session. Contact Super Admin."
        );
      }

      return await ctx.db.insert("paragraphs", {
        content,
        sessionId: args.sessionId,
        sessionName: sessionData.name,
        updatedAt: Date.now(),
        isLocked: true,
      });
    }

    // ================= FALLBACK =================
    console.log("ROLE MISMATCH ERROR:", role);
    throw new Error("Unauthorized: Role mismatch -> " + role);
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

// ================= GET ALL =================
export const getAllParagraphs = query({
  handler: async (ctx) => {
    return await ctx.db.query("paragraphs").collect();
  },
});

// ================= GET ONE =================
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

// ================= UPDATE =================
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

    const content = args.content.trim();

    const result = validateParagraphText(content);
    if (!result.valid) {
      throw new Error(
        "Invalid characters found: " + result.invalidChars.join(" ")
      );
    }

    await ctx.db.patch(args.id, {
      content,
      updatedAt: Date.now(),
    });
  },
});