import Anthropic from '@anthropic-ai/sdk';
import { PARSE_JD_SYSTEM, parseJDUser } from './prompts.js';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

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
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  return message.content[0].text;
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
