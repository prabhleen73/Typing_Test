import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";


//create student
export const createStudent = mutation({
  args: {
    name: v.string(),
    applicationNumber: v.string(),
    dob: v.string(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
  },

  handler: async (ctx, { name, applicationNumber, dob, sessionId,sessionName }) => {
    if (!name || !applicationNumber || !dob || !sessionId || !sessionName) {
      return { success: false, message: "Missing required fields" };
    }

    const firstName = name.trim().split(/\s+/)[0].toLowerCase();
    const firstFour = firstName.slice(0, 4);

    const [dd, mm, yyyy] = dob.split("-");
    const ddmmyyyy = `${dd}${mm}${yyyy}`;

    const generatedPassword = `${firstFour}${yyyy}`;

    const existing = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", applicationNumber)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        dob,
        password: generatedPassword,
        sessionId,
        sessionName,
      });

      return { success: true, updated: true };
    }

    await ctx.db.insert("students", {
      name,
      applicationNumber,
      dob,
      password: generatedPassword,
      sessionId,
      sessionName,
    });

    return { success: true, inserted: true };
  },
});


//verify student - create session
export const verifyStudent = mutation({
  args: {
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const username = args.username ?? args.name;
    const password = args.password;

    if (!username || !password) {
      return { success: false, message: "Missing username or password" };
    }

    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", q =>
        q.eq("applicationNumber", username)
      )
      .first();

    if (!student) {
      return { success: false, message: "Invalid credentials" };
    }

    //  BLOCK IF TEST ALREADY SUBMITTED
    const existingResult = await ctx.db
      .query("results")
      .withIndex("by_student", q =>
        q.eq("studentId", student.applicationNumber)
      )
      .first();

    if (existingResult) {
      return {
        success: false,
        message: "Test already submitted. Login not allowed."
      };
    }

    //  BLOCK IF TEST ALREADY STARTED
    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_studentId", q =>
        q.eq("studentId", student.applicationNumber)
      )
      .first();

    if (activeSession && activeSession.testActive) {
      return {
        success: false,
        message: "Test already started. Re-login not allowed."
      };
    }

    //  NOW check password
    if (password !== student.password) {
      return { success: false, message: "Invalid credentials" };
    }

    //  CREATE SESSION
    const expiresInMs = 60 * 60 * 1000;

    const session = await ctx.runMutation(api.sessions.createSession, {
      studentId: student.applicationNumber,
      expiresInMs,
    });

    if (!session || !session.token) {
      return {
        success: false,
        message: "Failed to create session. Please try again.",
      };
    }

    return {
      success: true,
      studentId: student.applicationNumber,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  },
});


/* ------------------------------------------
   CHECK STUDENT EXISTS (used by /test)
---------------------------------------------*/
export const checkExists = query({
  args: { studentId: v.string() },

  handler: async (ctx, { studentId }) => {
    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", studentId)
      )
      .first();

    return !!student;
  },
});

export const getStudentSession = query({
  args: { studentId: v.string() },
  handler: async (ctx, { studentId }) => {
    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", studentId)
      )
      .first();

    return student?.sessionId ?? null;
  },
});

export const getStudentById = query({
  args: { studentId: v.string() },
  handler: async (ctx, { studentId }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", studentId)
      )
      .first();
  },
});
