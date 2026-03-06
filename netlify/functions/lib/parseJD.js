import OpenAI from 'openai';
import { PARSE_JD_SYSTEM, parseJDUser } from './prompts.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Parses a job description into a structured role profile.
 * @param {string} jdText
 * @returns {Promise<object>} Role profile JSON
 */
export async function parseJD(jdText) {
  const userContent = parseJDUser(jdText);

  let text = await callClaude(PARSE_JD_SYSTEM, userContent);
  let profile;

  try {
    profile = JSON.parse(extractJSON(text));
  } catch {
    // Retry with explicit JSON-only instruction
    text = await callClaude(
      PARSE_JD_SYSTEM,
      userContent + '\n\nCRITICAL: Return ONLY valid JSON. No explanation, no markdown, no code blocks.'
    );
    profile = JSON.parse(extractJSON(text));
  }

  validateRoleProfile(profile);
  return profile;
}

async function callClaude(system, userContent) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages,
  });
  return completion.choices[0].message.content;
}

function extractJSON(text) {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
}

function validateRoleProfile(profile) {
  const required = ['roleTitle', 'roleSlug', 'summary', 'responsibilities', 'workflows'];
  for (const field of required) {
    if (!profile[field]) {
      throw new Error(`Role profile missing required field: ${field}`);
    }
  }
}
