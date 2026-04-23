import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ================= STUDENTS =================
  students: defineTable({
    name: v.optional(v.string()),
    applicationNumber: v.string(),
    dob: v.string(),
    password: v.string(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
  })
    .index("by_applicationNumber", ["applicationNumber"])
    .index("by_name", ["name"])
    .index("by_sessionId", ["sessionId"]),

  // ================= TEST SESSIONS =================
  testSessions: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // ================= USER SESSIONS =================
  sessions: defineTable({
    studentId: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    testActive: v.boolean(),

    //  used for timer restore across tabs/windows
    remainingSeconds: v.optional(v.number()),

    // (optional but recommended for future upgrade)
    updatedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_studentId", ["studentId"]),

  // ================= PARAGRAPHS =================
  paragraphs: defineTable({
    content: v.string(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
    updatedAt: v.number(),
    isLocked: v.boolean(),
  }).index("by_session", ["sessionId"]),

  // ================= RESULTS =================
  results: defineTable({
    studentId: v.string(),
    name: v.optional(v.string()),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),

    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    rawWpm: v.number(),
    kdph: v.optional(v.number()),

    text: v.string(),
    rawText: v.optional(v.string()),
    mistakes: v.optional(v.number()),
    correctedMistakes: v.optional(v.number()),
    uncorrectedMistakes: v.optional(v.number()),

    paragraphContent: v.string(),
    originalSymbols: v.number(),
    submittedAt: v.string(),
  })
    .index("by_student", ["studentId"])
    .index("by_submittedAt", ["submittedAt"])
    .index("by_session", ["sessionId"]),

  // ================= TIME SETTINGS =================
  timeSettings: defineTable({
    duration: v.number(),
  }),

  // ================= TEST SETTINGS =================
  testSettings: defineTable({
    postName: v.string(),
    examDate: v.number(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),
    qualifyingWpm: v.number(),
    qualifyingKdph: v.number(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // ================= DRAFTS =================
  typingTestDrafts: defineTable({
    studentId: v.string(),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),

    typedText: v.string(),
    started: v.boolean(),
    duration: v.number(),

    // ✔ backup timer (local recovery)
    remainingSeconds: v.number(),

    isSubmitted: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_student_session", ["studentId", "sessionId"]),

  // ================= ADMINS =================
  admins: defineTable({
    name: v.string(),
    email: v.string(),
    username: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("admin")
    ),
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  // ================= ADMIN SESSIONS =================
  adminSessions: defineTable({
    adminId: v.id("admins"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_adminId", ["adminId"]),
});