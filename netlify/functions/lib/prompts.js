export const PARSE_JD_SYSTEM = `You are an expert at analysing job descriptions to extract structured information for building AI assistant plugins. You extract facts only — do not invent responsibilities or tools that are not mentioned. Return valid JSON only with no explanation or markdown.`;

export function parseJDUser(jdText) {
  return `Analyse this job description and return this exact JSON structure:

{
  "roleTitle": "exact job title from the JD",
  "roleSlug": "kebab-case-slug-from-title",
  "summary": "one sentence: what this person does and for whom",
  "responsibilities": ["key responsibility 1", "key responsibility 2"],
  "toolsUsed": ["Tool1", "Tool2"],
  "domainKnowledge": ["topic area 1", "topic area 2"],
  "workflows": ["recurring task 1", "recurring task 2"],
  "regions": ["EMEA", "APAC"],
  "segments": ["enterprise", "mid-market"],
  "teamServed": "description of the internal team this person creates content or programs for, or null if none",
  "teamSlug": "kebab-case slug for the team they serve (e.g. sales-rep, engineer), or null",
  "isDualCandidate": true
}

Notes:
- isDualCandidate = true when this person designs programs/content/systems consumed by an identifiable internal team (sales reps, engineers, researchers, etc.) who would benefit from their own companion plugin
- toolsUsed: only tools explicitly named in the JD
- workflows: the 5-8 most important recurring tasks this person does

JD:
${jdText}`;
}

export const DESIGN_SCHEMA_SYSTEM = `You are a Cowork plugin architect. You design plugins that are genuinely useful to knowledge workers — not generic, not padded. Every command should solve a real problem this person faces. Every skill should encode knowledge they actually need. Return valid JSON only.`;

export function designSchemaUser(roleProfile, namespace, author, dual) {
  return `Design a complete Cowork plugin schema for this role:

ROLE PROFILE:
${JSON.stringify(roleProfile, null, 2)}

USER OPTIONS:
- Namespace: ${namespace}
- Author: ${author}
- Generate companion plugin: ${dual}

Return this JSON structure:

{
  "primaryPlugin": {
    "name": "[roleSlug]",
    "namespace": "${namespace}",
    "description": "one sentence: what this plugin helps the person do",
    "commands": [
      {
        "name": "command-name",
        "description": "one line — what it does, not how",
        "argumentHint": "--arg=<value> [--optional=<value>]",
        "usedConnectors": ["connector-slug"],
        "standalone": "what it does step by step without any connectors (always works)",
        "supercharged": "what it adds when specific connectors are live — name each connector",
        "outputTemplate": "describe the output format and key fields"
      }
    ],
    "skills": [
      {
        "name": "skill-slug",
        "description": "one line including: what knowledge this encodes AND when to trigger it",
        "sections": ["Section Name 1", "Section Name 2", "Section Name 3"]
      }
    ],
    "connectors": ["google-drive", "gong"]
  },
  "companionPlugin": null
}

If companionPlugin is requested AND isDualCandidate is true, populate companionPlugin with the same structure but designed for the team this person serves — the people who consume what the primary role produces.

Rules:
- 5–8 commands per plugin. Cover the most impactful recurring workflows.
- 3–5 skills per plugin. Each should encode a specific domain the role must draw on.
- Only include connectors genuinely useful for this role. Do not add connectors for tools not mentioned.
- Command names: lowercase, hyphenated, verb-first (e.g. prep-call, draft-brief, run-health-check)
- Skills: noun-phrase slugs (e.g. compliance-frameworks, pricing-model, research-methodology)`;
}

export const COMMAND_SYSTEM = `You write Cowork plugin command files. Follow the format exactly. Write in plain, direct language — no jargon, no padding, no filler. Be specific about what the command does and what the output looks like. Short sentences. Active voice.`;

export function commandUser(cmd, namespace, roleTitle, summary) {
  return `Write a Cowork command file with this exact format:

---
description: [DESCRIPTION]
argument-hint: "[ARGUMENT_HINT]"
---

# /[NAMESPACE]:[COMMAND_NAME]

> If connectors are not set up, see [CONNECTORS.md](../CONNECTORS.md).

[One sentence intro — what problem this solves]

## Usage
\`\`\`
/[NAMESPACE]:[COMMAND_NAME] [example with real values]
\`\`\`

Process these arguments: $ARGUMENTS

---

## How It Works
\`\`\`
STANDALONE (always works)
[Step by step what Claude does without any connectors]

SUPERCHARGED (when connectors are live)
[For each connector: * ConnectorName: what it reads or writes]
\`\`\`

---

## Output
\`\`\`
[Realistic ASCII output template with real field names and placeholder values in brackets]
\`\`\`

## After This Command

[Optional — what to do next, which commands to run]

---

Now write the file for:

Command name: ${cmd.name}
Namespace: ${namespace}
Description: ${cmd.description}
Argument hint: ${cmd.argumentHint}
Standalone mode: ${cmd.standalone}
Supercharged mode: ${cmd.supercharged}
Output format: ${cmd.outputTemplate}
Role context: ${roleTitle} — ${summary}`;
}

export const SKILL_SYSTEM = `You write Cowork plugin skill files. These encode domain expertise — methodologies, frameworks, and knowledge the AI should draw on automatically. Write with authority. Be specific, not generic. Include concrete examples, named frameworks, and clear principles. No padding.`;

export function skillUser(skill, roleTitle, summary, domainKnowledge, regions, segments) {
  return `Write a Cowork skill file with this exact format:

---
name: [SKILL_NAME]
description: [DESCRIPTION — include: what knowledge this encodes AND when Claude should draw on it]
---

# [Skill Title — title case]

[For each section in the sections list, write a substantive H2 section with real domain content specific to this role]

---

Now write the skill for:

Skill name: ${skill.name}
Description: ${skill.description}
Sections to include: ${JSON.stringify(skill.sections)}
Role context: ${roleTitle} — ${summary}
Domain context: ${JSON.stringify(domainKnowledge)}
Regions relevant: ${regions?.length ? regions.join(', ') : 'not specified'}
Segments relevant: ${segments?.length ? segments.join(', ') : 'not specified'}`;
}

export function connectorsUser(pluginName, namespace, roleTitle, connectors, commandsByConnector) {
  const connectorList = connectors.map(c => {
    const cmds = commandsByConnector[c] || [];
    return `${c}: [${cmds.join(', ')}]`;
  }).join('\n');

  return `Write a CONNECTORS.md file for a Cowork plugin. Format:

# Connectors

This plugin uses [N] connector[s]. Each is optional — the plugin works without them, but becomes significantly more powerful when connected.

## [ConnectorName]

**Used by:** \`/[namespace]:[command1]\`, \`/[namespace]:[command2]\`

[One paragraph: what this connector enables for this specific role]

**Setup:** [How to connect it in Cowork settings]

---

Write for:
Plugin: ${pluginName}, Namespace: ${namespace}, Role: ${roleTitle}
Connectors and their commands:
${connectorList}`;
}

export function readmeUser(schema, roleTitle, summary) {
  return `Write a README.md for a Cowork plugin. Include:
- What This Plugin Does (2-3 sentences)
- Commands (table: command | what it does)
- Skills (table: skill | what it encodes)
- Connectors (table: connector | used by | what it adds)
- Getting Started (3-4 bullet points)

Plugin: ${JSON.stringify(schema, null, 2)}
Role context: ${roleTitle} — ${summary}`;
}
