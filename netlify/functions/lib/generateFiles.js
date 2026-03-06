import Anthropic from '@anthropic-ai/sdk';
import { resolveConnector, getMcpUrl } from './mcpRegistry.js';
import {
  COMMAND_SYSTEM, commandUser,
  SKILL_SYSTEM, skillUser,
  connectorsUser, readmeUser,
} from './prompts.js';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generates all plugin files for a given plugin schema.
 * Calls onProgress with status strings as files are created.
 *
 * @param {object} pluginSchema  - The plugin schema from designSchema
 * @param {object} roleProfile   - The role profile from parseJD
 * @param {string} author        - Author name
 * @param {Function} onProgress  - Callback(message: string)
 * @returns {Promise<Array<{path: string, content: string}>>}
 */
export async function generateFiles(pluginSchema, roleProfile, author, onProgress) {
  const files = [];
  const { roleTitle, summary, domainKnowledge = [], regions = [], segments = [] } = roleProfile;
  const {
    name,
    namespace,
    description,
    commands = [],
    skills = [],
    connectors = [],
  } = pluginSchema;

  // 3a. plugin.json — no LLM needed
  files.push({
    path: '.claude-plugin/plugin.json',
    content: JSON.stringify({
      name,
      version: '1.0.0',
      description,
      author: { name: author || 'PluginForge' },
    }, null, 2),
  });
  onProgress(`✓ Generated .claude-plugin/plugin.json`);

  // 3b. .mcp.json — map connectors through registry; omit unknowns
  const resolvedConnectors = {};
  const unknownConnectors = [];

  for (const connector of connectors) {
    const key = resolveConnector(connector);
    if (key) {
      resolvedConnectors[key] = { type: 'http', url: getMcpUrl(key) };
    } else {
      unknownConnectors.push(connector);
    }
  }

  files.push({
    path: '.mcp.json',
    content: JSON.stringify({ mcpServers: resolvedConnectors }, null, 2),
  });
  onProgress(`✓ Generated .mcp.json`);

  // 3c. Command files — one LLM call per command
  for (const cmd of commands) {
    onProgress(`→ Generating commands/${cmd.name}.md…`);
    try {
      const content = await callClaude(
        COMMAND_SYSTEM,
        commandUser(cmd, namespace, roleTitle, summary)
      );
      files.push({ path: `commands/${cmd.name}.md`, content });
      onProgress(`✓ Generated commands/${cmd.name}.md`);
    } catch (err) {
      onProgress(`✗ Skipped commands/${cmd.name}.md (${err.message})`);
    }
  }

  // 3d. Skill files — one LLM call per skill
  for (const skill of skills) {
    onProgress(`→ Generating skills/${skill.name}/SKILL.md…`);
    try {
      const content = await callClaude(
        SKILL_SYSTEM,
        skillUser(skill, roleTitle, summary, domainKnowledge, regions, segments)
      );
      files.push({ path: `skills/${skill.name}/SKILL.md`, content });
      onProgress(`✓ Generated skills/${skill.name}/SKILL.md`);
    } catch (err) {
      onProgress(`✗ Skipped skills/${skill.name}/SKILL.md (${err.message})`);
    }
  }

  // Build connector→commands map for CONNECTORS.md
  const commandsByConnector = {};
  for (const cmd of commands) {
    for (const c of (cmd.usedConnectors || [])) {
      const key = resolveConnector(c) || c;
      if (!commandsByConnector[key]) commandsByConnector[key] = [];
      commandsByConnector[key].push(cmd.name);
    }
  }

  // 3e. CONNECTORS.md — always generate; note unknown connectors
  onProgress(`→ Generating CONNECTORS.md…`);
  try {
    const knownKeys = Object.keys(resolvedConnectors);
    const allConnectors = [...knownKeys, ...unknownConnectors];

    let content;
    if (allConnectors.length > 0) {
      content = await callClaude(
        null,
        connectorsUser(name, namespace, roleTitle, allConnectors, commandsByConnector)
      );
      if (unknownConnectors.length > 0) {
        content += `\n\n---\n\n> **Note:** The following connectors were mentioned in the job description but are not yet in the MCP registry. Confirm the MCP URLs before use: ${unknownConnectors.join(', ')}.`;
      }
    } else {
      content = `# Connectors\n\nThis plugin has no connectors configured. All commands run in standalone mode using Claude's context and your manual inputs.\n\nTo add connectors later, edit \`.mcp.json\` and add MCP server entries.\n`;
    }

    files.push({ path: 'CONNECTORS.md', content });
    onProgress(`✓ Generated CONNECTORS.md`);
  } catch (err) {
    onProgress(`✗ Skipped CONNECTORS.md (${err.message})`);
  }

  // 3f. README.md — one LLM call
  onProgress(`→ Generating README.md…`);
  try {
    const content = await callClaude(null, readmeUser(pluginSchema, roleTitle, summary));
    files.push({ path: 'README.md', content });
    onProgress(`✓ Generated README.md`);
  } catch (err) {
    onProgress(`✗ Skipped README.md (${err.message})`);
  }

  return files;
}

async function callClaude(system, userContent) {
  const params = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userContent }],
  };
  if (system) params.system = system;

  const message = await client.messages.create(params);
  const block = message.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response format from Claude API');
  }
  return block.text;
}
