import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // Students table
students: defineTable({
  name: v.string(),
  applicationNumber: v.string(),
  dob: v.string(),
  passwordHash: v.string(),
  sessionId: v.id("testSessions"),   
  sessionName: v.string(), 
})
  .index("by_applicationNumber", ["applicationNumber"])
  .index("by_name", ["name"])
  .index("by_sessionId", ["sessionId"]),


  // Secure backend sessions
  sessions: defineTable({
    studentId: v.string(),     // applicationNumber
    token: v.string(),         // session token
    expiresAt: v.number(),     // timestamp ms
    testActive: v.boolean()
  })
    .index("by_token", ["token"])
    .index("by_studentId", ["studentId"]),

  // Paragraphs table
  paragraphs: defineTable({
    content: v.string(),
  }),

  // Results table
  results: defineTable({
    studentId: v.string(),
    sessionId: v.id("testSessions"),
    paragraphId: v.id("paragraphs"),
    symbols: v.number(),
    seconds: v.number(),
    accuracy: v.number(),
    wpm: v.number(),
    text: v.string(),
    paragraphContent: v.string(),
    originalSymbols: v.number(),
    submittedAt: v.string(),
  })
    .index("by_student", ["studentId"])
    .index("by_submittedAt", ["submittedAt"])
    .index("by_session", ["sessionId"]),
});
