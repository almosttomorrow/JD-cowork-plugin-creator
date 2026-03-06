/**
 * Netlify Background Function: generate-background
 *
 * Accepts a POST request with { jd, namespace, author, jobId }.
 * Netlify automatically returns 202 to the client and continues running
 * this function in the background (up to 15 minutes).
 *
 * Progress and results are written to /tmp/pluginforge-[jobId].json
 * and read by the status.js function.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import OpenAI from 'openai';
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

  const { jd, namespace, author, jobId } = body;

  if (!jd || !namespace || !jobId) {
    return { statusCode: 400, body: 'Missing required fields: jd, namespace, jobId' };
  }

  // Initialize status file immediately
  writeStatus(jobId, { status: 'processing', logs: [], result: null });

  try {
    // Step 0: Verify OpenAI connection
    appendLog(jobId, '◆ Connecting to OpenAI...');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const testCompletion = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }],
    });
    if (!testCompletion.choices?.[0]) throw new Error('No response from OpenAI');
    appendLog(jobId, '✓ Connected (gpt-4o ready)');

    // Step 1: Parse JD
    appendLog(jobId, '◆ Reading job description...');
    const roleProfile = await parseJD(jd);
    appendLog(jobId, `✓ Role identified: ${roleProfile.roleTitle}`);
    if (roleProfile.summary) {
      appendLog(jobId, `  · ${roleProfile.summary.slice(0, 100)}${roleProfile.summary.length > 100 ? '...' : ''}`);
    }

    // Step 2: Design plugin schema
    appendLog(jobId, '◆ Designing plugin structure...');
    const schemaResult = await designSchema(roleProfile, namespace, author, false);
    const { primaryPlugin } = schemaResult;

    const cmdCount = primaryPlugin.commands?.length || 0;
    const skillCount = primaryPlugin.skills?.length || 0;
    const connCount = primaryPlugin.connectors?.length || 0;
    appendLog(jobId, `✓ Structure ready`);
    appendLog(jobId, `  · ${cmdCount} command${cmdCount !== 1 ? 's' : ''} planned`);
    if (skillCount > 0) appendLog(jobId, `  · ${skillCount} skill area${skillCount !== 1 ? 's' : ''} planned`);
    if (connCount > 0) appendLog(jobId, `  · ${connCount} tool connection${connCount !== 1 ? 's' : ''} found`);

    // Step 3: Generate all files
    appendLog(jobId, '◆ Writing plugin files...');
    const primaryFiles = await generateFiles(
      primaryPlugin,
      roleProfile,
      author,
      (msg) => appendLog(jobId, msg)
    );

    const totalFiles = primaryFiles.length;
    appendLog(jobId, `✓ All files written (${totalFiles} files)`);

    // Step 4: Package result
    appendLog(jobId, '◆ Packaging...');
    const result = packageResult([{ name: primaryPlugin.name || roleProfile.roleSlug, files: primaryFiles }]);
    appendLog(jobId, '✓ Done — your plugin is ready to download');

    writeStatus(jobId, {
      status: 'complete',
      logs: readStatus(jobId).logs,
      result,
    });
  } catch (err) {
    appendLog(jobId, `✗ Error: ${err.message}`);
    writeStatus(jobId, {
      status: 'error',
      logs: readStatus(jobId).logs,
      result: null,
      error: err.message,
    });
    console.error('[generate-background] Error:', err);
  }

  // Return value is ignored by Netlify background functions (202 sent automatically)
  return { statusCode: 202 };
};
