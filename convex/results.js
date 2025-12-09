import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    name: v.optional(v.string()),  
    paragraphId: v.id("paragraphs"),
    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    text: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    if (!args.studentId || !args.paragraphId) {
      return { success: false, message: "Missing required fields" };
    }
    //check if already attempted
    const existing = await ctx.db
      .query("results")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.eq(q.field("paragraphId"), args.paragraphId))
      .first();

    if (existing) {
      return { success: false, message: "Already attempted" };
    }

    //get paragraph
    const paragraph = await ctx.db.get(args.paragraphId);
    if (!paragraph) {
      return { success: false, message: "Paragraph not found" };
    }

    const paragraphContent = paragraph.content ?? "";
    const originalSymbols = paragraphContent.length;

    //  fetch student from db
    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", args.studentId)
      )
      .first();

    if (!student) {
      return { success: false, message: "Student not found" };
    }

    
    await ctx.db.insert("results", {
      studentId: args.studentId,
      name: args.name ?? student.name ?? "N/A",
      sessionId: student.sessionId,   
      paragraphId: args.paragraphId,
      symbols: args.symbols,
      seconds: args.seconds,
      accuracy: args.accuracy,
      wpm: args.wpm,
      text: args.text ?? "",
      paragraphContent,
      originalSymbols,
      submittedAt: new Date().toISOString(),
    });

    return { success: true };
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

   // get results be session
export const getResultsBySession = query({
  args: { sessionId: v.id("testSessions") },
  handler: async (ctx, { sessionId }) => {
    //  get results
    const results = await ctx.db
      .query("results")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    //  get session name
    const session = await ctx.db.get(sessionId);

    return results.map((r) => ({
      ...r,
      sessionName: session?.name || "N/A",
      name: r.name || "N/A",
    }));
  },
});
