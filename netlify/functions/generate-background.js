/**
 * Netlify Background Function: generate-background
 *
 * Accepts a POST request with { jd, namespace, author, dual, jobId }.
 * Netlify automatically returns 202 to the client and continues running
 * this function in the background (up to 15 minutes).
 *
 * Progress and results are written to /tmp/pluginforge-[jobId].json
 * and read by the status.js function.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseJD } from './lib/parseJD.js';
import { designSchema } from './lib/designSchema.js';
import { generateFiles } from './lib/generateFiles.js';
import { packageResult } from './lib/packageResult.js';

function statusPath(jobId) {
  return join(tmpdir(), `pluginforge-${jobId}.json`);
}

function readStatus(jobId) {
  const p = statusPath(jobId);
  if (!existsSync(p)) return { status: 'processing', logs: [], result: null };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { status: 'processing', logs: [], result: null };
  }
}

function writeStatus(jobId, data) {
  writeFileSync(statusPath(jobId), JSON.stringify(data));
}

function appendLog(jobId, line) {
  const current = readStatus(jobId);
  current.logs = [...(current.logs || []), line];
  writeStatus(jobId, current);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { jd, namespace, author, dual, jobId } = body;

  if (!jd || !namespace || !jobId) {
    return { statusCode: 400, body: 'Missing required fields: jd, namespace, jobId' };
  }

  // Initialize status file immediately
  writeStatus(jobId, { status: 'processing', logs: [], result: null });

  try {
    // Step 1: Parse JD
    appendLog(jobId, '→ Parsing job description…');
    const roleProfile = await parseJD(jd);
    appendLog(jobId, `✓ Parsed role profile: ${roleProfile.roleTitle}`);

    // Step 2: Design plugin schema
    appendLog(jobId, '→ Designing plugin schema…');
    const schemaResult = await designSchema(roleProfile, namespace, author, dual);
    const { primaryPlugin, companionPlugin } = schemaResult;

    const primaryCmdCount = primaryPlugin.commands?.length || 0;
    const primarySkillCount = primaryPlugin.skills?.length || 0;
    appendLog(jobId, `✓ Designed primary schema: ${primaryCmdCount} commands, ${primarySkillCount} skills`);

    if (companionPlugin) {
      const compCmdCount = companionPlugin.commands?.length || 0;
      const compSkillCount = companionPlugin.skills?.length || 0;
      appendLog(jobId, `✓ Designed companion schema: ${compCmdCount} commands, ${compSkillCount} skills`);
    }

    // Step 3: Generate all files
    const plugins = [];

    appendLog(jobId, `→ Generating files for ${primaryPlugin.name || roleProfile.roleSlug}…`);
    const primaryFiles = await generateFiles(
      primaryPlugin,
      roleProfile,
      author,
      (msg) => appendLog(jobId, msg)
    );
    plugins.push({ name: primaryPlugin.name || roleProfile.roleSlug, files: primaryFiles });

    if (companionPlugin) {
      appendLog(jobId, `→ Generating files for companion plugin ${companionPlugin.name}…`);
      const companionProfile = {
        ...roleProfile,
        roleTitle: companionPlugin.name,
        summary: `Companion plugin for ${roleProfile.teamServed || 'the team'}`,
      };
      const companionFiles = await generateFiles(
        companionPlugin,
        companionProfile,
        author,
        (msg) => appendLog(jobId, msg)
      );
      plugins.push({ name: companionPlugin.name, files: companionFiles });
    }

    // Step 4: Package result
    const result = packageResult(plugins);

    const totalFiles = plugins.reduce((sum, p) => sum + p.files.length, 0);
    appendLog(jobId, `✓ Done — ${totalFiles} files generated`);

    writeStatus(jobId, {
      status: 'complete',
      logs: readStatus(jobId).logs,
      result,
    });
  } catch (err) {
    const current = readStatus(jobId);
    appendLog(jobId, `✗ Error: ${err.message}`);
    writeStatus(jobId, {
      status: 'error',
      logs: current.logs || [],
      result: null,
      error: err.message,
    });
    console.error('[generate-background] Error:', err);
  }

  // Return value is ignored by Netlify background functions (202 sent automatically)
  return { statusCode: 202 };
};
