import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function normalizeApplicationNumber(value) {
  return value?.toString().trim();
}

function generateStudentPassword(name, dob) {
  const firstName = name.trim().split(/\s+/)[0].toLowerCase();
  const firstFour = firstName.slice(0, 4);
  const year = new Date(dob).getFullYear();
  return `${firstFour}${year}`;
}

function getRemainingSeconds(session, now = Date.now()) {
  if (typeof session?.testEndsAt === "number") {
    return Math.max(0, Math.ceil((session.testEndsAt - now) / 1000));
  }

  if (typeof session?.remainingSeconds === "number") {
    return Math.max(0, session.remainingSeconds);
  }

  return null;
}

//create student
export const createStudent = mutation({
  args: {
    name: v.string(),
    applicationNumber: v.string(),
    dob: v.string(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
  },

  handler: async (ctx, { name, applicationNumber, dob, sessionId, sessionName }) => {
    const normalizedName = name?.trim();
    const normalizedApplicationNumber = normalizeApplicationNumber(applicationNumber);
    const normalizedDob = dob?.trim();

    if (!normalizedName || !normalizedApplicationNumber || !normalizedDob || !sessionId || !sessionName) {
      return { success: false, message: "Missing required fields" };
    }

    const generatedPassword = generateStudentPassword(normalizedName, normalizedDob);
    //  Check if student already exists
    const existing = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", normalizedApplicationNumber)
      )
      .first();

    if (existing) {
      return {
        success: false,
        message: "Student already exists",
      };
    }

    // ✅ Insert only if student does not exist
    await ctx.db.insert("students", {
      name: normalizedName,
      applicationNumber: normalizedApplicationNumber,
      dob: normalizedDob,
      password: generatedPassword,
      sessionId,
      sessionName,
    });

    return { success: true };
  },
});

//verify student - create session
export const verifyStudent = mutation({
  args: {
    username: v.optional(v.string()),
    applicationNumber: v.optional(v.string()),
    studentId: v.optional(v.string()),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const username = normalizeApplicationNumber(
      args.username ?? args.applicationNumber ?? args.studentId ?? args.name
    );

    const password = args.password?.trim();

    if (!username || !password) {
      return { success: false, message: "Missing username or password" };
    }

    console.log("verifyStudent input:", username);

    const student = await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", username)
      )
      .first();

    if (!student) {
      return { success: false, message: "Invalid credentials" };
    }

    //  1. CHECK PASSWORD FIRST (CASE INSENSITIVE)
    const suppliedPassword = password.toLowerCase();
    const storedPassword = student.password?.trim().toLowerCase();
    const generatedPassword = generateStudentPassword(student.name, student.dob)
      .trim()
      .toLowerCase();

    if (
      suppliedPassword !== storedPassword &&
      suppliedPassword !== generatedPassword
    ) {
      return { success: false, message: "Invalid credentials" };
    }

    //  2. BLOCK IF TEST ALREADY SUBMITTED
    const existingResult = await ctx.db
      .query("results")
      .withIndex("by_student", (q) =>
        q.eq("studentId", student.applicationNumber)
      )
      .first();

    if (existingResult) {
      return {
        success: false,
        message: "Test already submitted. Login not allowed.",
      };
    }

    //  3. RESUME IF TEST ALREADY STARTED (Kick old device by rotating token)
    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_studentId", (q) =>
        q.eq("studentId", student.applicationNumber)
      )
      .first();

    if (activeSession && activeSession.testActive) {
      const remainingSeconds = getRemainingSeconds(activeSession);
      //  Safe token generator (works in Convex runtime)
      const newToken = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}_${Math.random().toString(36).slice(2)}`;

      const newExpiresAt = Date.now() + 60 * 60 * 1000;

      //  Update token so old device session becomes invalid
      await ctx.db.patch(activeSession._id, {
        token: newToken,
        expiresAt: newExpiresAt,
        remainingSeconds: remainingSeconds ?? 0,
        testActive: (remainingSeconds ?? 0) > 0,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        resume: true,
        message: "Test already started. Resuming on this device.",
        studentId: student.applicationNumber,
        token: newToken,
        expiresAt: newExpiresAt,
        sessionId: student.sessionId,
        remainingSeconds,
        testStartedAt: activeSession.testStartedAt ?? null,
        testEndsAt: activeSession.testEndsAt ?? null,
        name: student.name,

      };
    }

    //  4. CREATE NEW SESSION (first login)
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
      resume: false,
      studentId: student.applicationNumber,
      token: session.token,
      expiresAt: session.expiresAt,
      sessionId: student.sessionId,
      name: student.name,
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

export const getStudentDebug = query({
  args: { applicationNumber: v.string() },
  handler: async (ctx, { applicationNumber }) => {
    return await ctx.db
      .query("students")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", applicationNumber.trim())
      )
      .first();
  },
});

export const getExistingStudents = query({
  args: {
    applicationNumbers: v.array(v.string()),
  },

  handler: async (ctx, { applicationNumbers }) => {

    // remove duplicates first
    const uniqueApps = [...new Set(applicationNumbers)];

    // fetch all students once
    const students = await ctx.db.query("students").collect();

    const existingSet = new Set(
      students.map((s) => s.applicationNumber)
    );

    const existing = uniqueApps.filter(app => existingSet.has(app));

    return existing;
  },
});
