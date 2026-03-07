/**
 * Netlify Background Function: generate-background
 *
 * Accepts a POST request with { jd, namespace, author, jobId }.
 * Netlify automatically returns 202 to the client and continues running
 * this function in the background (up to 15 minutes).
 *
 * Progress and results are stored in Netlify Blobs (shared across all
 * function invocations) and read by the status.js function.
 */

import { getStore } from '@netlify/blobs';
import OpenAI from 'openai';
import { parseJD } from './lib/parseJD.js';
import { designSchema } from './lib/designSchema.js';
import { generateFiles } from './lib/generateFiles.js';
import { packageResult } from './lib/packageResult.js';

function pluginStore() {
  return getStore('plugin-status');
}

async function readStatus(jobId) {
  try {
    const data = await pluginStore().get(jobId, { type: 'json' });
    return data || { status: 'processing', logs: [], result: null, progress: null };
  } catch {
    return { status: 'processing', logs: [], result: null, progress: null };
  }
}

async function writeStatus(jobId, data) {
  await pluginStore().setJSON(jobId, data);
}

async function appendLog(jobId, line, progress) {
  const current = await readStatus(jobId);
  current.logs = [...(current.logs || []), line];
  if (progress !== undefined) current.progress = progress;
  await writeStatus(jobId, current);
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

  // Initialize status blob immediately
  await writeStatus(jobId, { status: 'processing', logs: [], result: null, progress: null });

  try {
    // Step 0: Verify OpenAI connection
    await appendLog(jobId, '◆ Connecting to OpenAI...');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const testCompletion = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }],
    });
    if (!testCompletion.choices?.[0]) throw new Error('No response from OpenAI');
    await appendLog(jobId, '✓ Connected (gpt-4o ready)');

    // Step 1: Parse JD
    await appendLog(jobId, '◆ Reading job description...');
    const roleProfile = await parseJD(jd);
    await appendLog(jobId, `✓ Role identified: ${roleProfile.roleTitle}`);
    if (roleProfile.summary) {
      await appendLog(jobId, `  · ${roleProfile.summary.slice(0, 100)}${roleProfile.summary.length > 100 ? '...' : ''}`);
    }

    // Step 2: Design plugin schema
    await appendLog(jobId, '◆ Designing plugin structure...');
    const schemaResult = await designSchema(roleProfile, namespace, author, false);
    const { primaryPlugin } = schemaResult;

    const cmdCount = primaryPlugin.commands?.length || 0;
    const skillCount = primaryPlugin.skills?.length || 0;
    const connCount = primaryPlugin.connectors?.length || 0;
    await appendLog(jobId, `✓ Structure ready`);
    await appendLog(jobId, `  · ${cmdCount} command${cmdCount !== 1 ? 's' : ''} planned`);
    if (skillCount > 0) await appendLog(jobId, `  · ${skillCount} skill area${skillCount !== 1 ? 's' : ''} planned`);
    if (connCount > 0) await appendLog(jobId, `  · ${connCount} tool connection${connCount !== 1 ? 's' : ''} found`);

    // Step 3: Generate all files
    await appendLog(jobId, '◆ Writing plugin files...');

    // Total: plugin.json + .mcp.json + commands + skills + CONNECTORS.md + README.md
    const totalFiles = 2 + cmdCount + skillCount + 2;
    let filesBuilt = 0;

    const primaryFiles = await generateFiles(
      primaryPlugin,
      roleProfile,
      author,
      async (msg) => {
        if (msg.startsWith('✓ Generated')) {
          filesBuilt++;
          await appendLog(jobId, msg, { current: filesBuilt, total: totalFiles });
        } else {
          await appendLog(jobId, msg);
        }
      }
    );

    const totalFilesActual = primaryFiles.length;
    await appendLog(jobId, `✓ All files written (${totalFilesActual} files)`);

    // Step 4: Package result
    await appendLog(jobId, '◆ Packaging...');
    const result = packageResult([{ name: primaryPlugin.name || roleProfile.roleSlug, files: primaryFiles }]);
    await appendLog(jobId, '✓ Done — your plugin is ready to download');

    const finalStatus = await readStatus(jobId);
    await writeStatus(jobId, {
      status: 'complete',
      logs: finalStatus.logs,
      result,
      progress: { current: totalFiles, total: totalFiles },
    });
  } catch (err) {
    await appendLog(jobId, `✗ Error: ${err.message}`);
    const errStatus = await readStatus(jobId);
    await writeStatus(jobId, {
      status: 'error',
      logs: errStatus.logs,
      result: null,
      error: err.message,
    });
    console.error('[generate-background] Error:', err);
  }

  // Return value is ignored by Netlify background functions (202 sent automatically)
  return { statusCode: 202 };
};
