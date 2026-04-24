import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function countMatchingPrefix(sourceText, typedText) {
  const safeSource = sourceText ?? "";
  const safeTyped = typedText ?? "";
  let matched = 0;

  for (let i = 0; i < safeTyped.length; i += 1) {
    if (safeTyped[i] !== safeSource[i]) {
      break;
    }
    matched += 1;
  }

  return matched;
}

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

//Save Result 
export const saveResult = mutation({
  args: {
    studentId: v.string(),
    paragraphId: v.id("paragraphs"),
    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    rawWpm: v.number(),
    text: v.optional(v.string()),
    rawText: v.optional(v.string()), 
    kdph: v.number(), 
    mistakes: v.optional(v.number()),
    correctedMistakes: v.optional(v.number()),
    uncorrectedMistakes: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    if (!args.studentId || !args.paragraphId) {
      throw new Error("Missing required fields");
    }

    // prevent duplicate attempt
    const existing = await ctx.db
      .query("results")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("paragraphId"), args.paragraphId))
      .first();

    if (existing) {
      throw new Error("Already attempted");
    }

    // get paragraph
    const paragraph = await ctx.db.get(args.paragraphId);
    if (!paragraph) {
      throw new Error("Paragraph not found");
    }

    const paragraphContent = (paragraph.content ?? "").replace(/^\s+|\uFEFF/g, "");
    const originalSymbols = paragraphContent.length;

    // fetch student
    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", args.studentId)
      )
      .first();

    if (!student) {
      throw new Error("Student not found");
    }
    const safeRawText = args.rawText ?? "";
    const derivedSymbols = countMatchingPrefix(paragraphContent, safeRawText);
    const symbols = Math.max(args.symbols ?? 0, derivedSymbols);
    const safeSeconds = Math.max(1, args.seconds);
    const rawWpm = Number(((symbols * 60) / (5 * safeSeconds)).toFixed(2));
    const wpm = Math.floor(rawWpm);
    const kdph = Math.round((symbols * 3600) / safeSeconds);
    const finalText = args.text?.length ? args.text : safeRawText.slice(0, symbols);

    const resultId = await ctx.db.insert("results", {
  studentId: args.studentId,     
  name: student.name || "N/A",
  sessionId: student.sessionId, 
  paragraphId: args.paragraphId,
  symbols,
  seconds: safeSeconds,
  accuracy: args.accuracy,
  wpm,
  rawWpm,
  kdph, 
  text: finalText,
  rawText: safeRawText,
  mistakes: args.mistakes ?? 0,
  correctedMistakes: args.correctedMistakes ?? 0,
  uncorrectedMistakes: args.uncorrectedMistakes ?? 0,
  paragraphContent,
  originalSymbols,
  submittedAt: new Date().toISOString(),
});

    return resultId;
  },
});

  //get all results -admin
export const getAllResults = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("results")
      .withIndex("by_submittedAt")
      .order("desc")
      .collect();
  },
});


/* =========================================================
   GET RESULTS BY SESSION (ADMIN PAGE)
========================================================= */

export const getResultsBySession = query({
  args: { sessionId: v.id("testSessions") },

  handler: async (ctx, { sessionId }) => {
    const results = await ctx.db
      .query("results")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    const session = await ctx.db.get(sessionId);

    return results.map((r) => ({
      ...r,
      sessionName: session?.name || "N/A",
      name: r.name || "N/A",
    }));
  },
});


/* =========================================================
   ✅ GET SINGLE RESULT BY ID (FOR TEST SUBMITTED PAGE)
========================================================= */

export const getResultById = query({
  args: { id: v.id("results") },
  handler: async (ctx, { id }) => {
    const result = await ctx.db.get(id);
    if (!result) return null;

    // get session
    const session = await ctx.db.get(result.sessionId);

    return {
      ...result,
      sessionName: session?.name || "N/A",
    };
  },
});
