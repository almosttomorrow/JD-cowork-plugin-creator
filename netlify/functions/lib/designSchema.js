import Anthropic from '@anthropic-ai/sdk';
import { DESIGN_SCHEMA_SYSTEM, designSchemaUser } from './prompts.js';

const client = new Anthropic();

/**
 * Designs the full plugin schema from a role profile.
 * @param {object} roleProfile
 * @param {string} namespace
 * @param {string} author
 * @param {boolean} dual
 * @returns {Promise<{primaryPlugin: object, companionPlugin: object|null}>}
 */
export async function designSchema(roleProfile, namespace, author, dual) {
  const userContent = designSchemaUser(roleProfile, namespace, author, dual);

  let text = await callClaude(DESIGN_SCHEMA_SYSTEM, userContent);
  let schema;

  try {
    schema = JSON.parse(extractJSON(text));
  } catch {
    text = await callClaude(
      DESIGN_SCHEMA_SYSTEM,
      userContent + '\n\nCRITICAL: Return ONLY valid JSON. No explanation, no markdown, no code blocks.'
    );
    schema = JSON.parse(extractJSON(text));
  }

  validateSchema(schema);
  return schema;
}

async function callClaude(system, userContent) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  return message.content[0].text;
}

function extractJSON(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
}

function validateSchema(schema) {
  if (!schema.primaryPlugin) {
    throw new Error('Schema missing primaryPlugin');
  }
  if (!schema.primaryPlugin.commands || schema.primaryPlugin.commands.length < 3) {
    throw new Error('Primary plugin must have at least 3 commands');
  }
  if (!schema.primaryPlugin.skills || schema.primaryPlugin.skills.length < 1) {
    throw new Error('Primary plugin must have at least 1 skill');
  }
}
