import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

//Character validation
const VALID_CHAR_REGEX = /^[\x20-\x7E]+$/;

// Validate text before saving
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

  // set paragraph-overwrite old one
export const setParagraph = mutation({
  args: { content: v.string() },

  handler: async (ctx, { content }) => {
    // Validate text
    const result = validateParagraphText(content);
    if (!result.valid) {
      throw new Error(
        "Invalid characters found: " + result.invalidChars.join(" ")
      );
    }

    // Check if paragraph exists
    const existing = await ctx.db.query("paragraphs").first();

    if (existing) {
      // Overwrite existing paragraph
      await ctx.db.patch(existing._id, {
        content: content.trim()
      });

      return existing._id;
    }

    // Insert new paragraph 
    const id = await ctx.db.insert("paragraphs", {
      content: content.trim()
    });

    return id;
  },
});

 
   // return the one saved
 
export const getParagraph = query({
  handler: async (ctx) => {
    return await ctx.db.query("paragraphs").first();
  },
});
