import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Students table
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

      // Test Sessions
    testSessions: defineTable({
  name: v.string(),
  createdAt: v.number(),
}),

  // Secure backend sessions
  sessions: defineTable({
    studentId: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    testActive: v.boolean(),
  })
    .index("by_token", ["token"])
    .index("by_studentId", ["studentId"]),

  // Paragraphs table
  paragraphs: defineTable({
    content: v.string(),
    sessionId: v.id("testSessions"),
    sessionName: v.string(),   
    updatedAt: v.number(),
    isLocked: v.boolean(),   

  }).index("by_session", ["sessionId"]),

  // Results table
  results: defineTable({
    studentId: v.string(),
    name: v.optional(v.string()),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),

    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    kdph: v.optional(v.number()),

    text: v.string(),
    paragraphContent: v.string(),
    originalSymbols: v.number(),
    submittedAt: v.string(),
  })
    .index("by_student", ["studentId"])
    .index("by_submittedAt", ["submittedAt"])
    .index("by_session", ["sessionId"]),

  // Time Settings
timeSettings: defineTable({
  duration: v.number(),
}),


// Test Qualification Settings
testSettings: defineTable({
  postName:v.string(),
  examDate:v.number(),
  sessionId: v.id("testSessions"),
  sessionName: v.string(),
  qualifyingWpm: v.number(),
  qualifyingKdph: v.number(),
  updatedAt: v.number(),
}).index("by_session", ["sessionId"]),

  // Drafts
  typingTestDrafts: defineTable({
    studentId: v.string(),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),

    typedText: v.string(),
    started: v.boolean(),
    duration: v.number(),
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


  // Admin Sessions
  adminSessions: defineTable({
    adminId: v.id("admins"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_adminId", ["adminId"]),
});