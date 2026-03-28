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

  const store = getStore('plugin-status');

  // In-memory job state — no read-before-write needed, single source of truth
  const job = { status: 'processing', logs: [], result: null, progress: null };

  const flush = (updates = {}) => {
    Object.assign(job, updates);
    return store.setJSON(jobId, job);
  };

  const log = (line, progress) => {
    job.logs.push(line);
    if (progress !== undefined) job.progress = progress;
    return store.setJSON(jobId, job);
  };

  await flush(); // Initialize status blob

  try {
    // Step 0: Verify OpenAI connection
    await log('◆ Connecting to OpenAI...');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const testCompletion = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'ping' }],
    });
    if (!testCompletion.choices?.[0]) throw new Error('No response from OpenAI');
    await log('✓ Connected (gpt-4o ready)');

    // Step 1: Parse JD
    await log('◆ Reading job description...');
    const roleProfile = await parseJD(jd);
    await log(`✓ Role identified: ${roleProfile.roleTitle}`);
    if (roleProfile.summary) {
      await log(`  · ${roleProfile.summary.slice(0, 100)}${roleProfile.summary.length > 100 ? '...' : ''}`);
    }

    // Step 2: Design plugin schema
    await log('◆ Designing plugin structure...');
    const schemaResult = await designSchema(roleProfile, namespace, author, false);
    const { primaryPlugin } = schemaResult;

    const cmdCount = primaryPlugin.commands?.length || 0;
    const skillCount = primaryPlugin.skills?.length || 0;
    const connCount = primaryPlugin.connectors?.length || 0;
    await log(`✓ Structure ready`);
    await log(`  · ${cmdCount} command${cmdCount !== 1 ? 's' : ''} planned`);
    if (skillCount > 0) await log(`  · ${skillCount} skill area${skillCount !== 1 ? 's' : ''} planned`);
    if (connCount > 0) await log(`  · ${connCount} tool connection${connCount !== 1 ? 's' : ''} found`);

    // Step 3: Generate all files
    await log('◆ Writing plugin files...');

    // Total: plugin.json + .mcp.json + commands + skills + CONNECTORS.md + README.md
    const totalFiles = 2 + cmdCount + skillCount + 2;
    let filesBuilt = 0;

    const primaryFiles = await generateFiles(
      primaryPlugin,
      roleProfile,
      author,
      async (msg) => {
        // Count both successes and skips so the bar always reaches 100%
        if (msg.startsWith('✓ Generated') || msg.startsWith('✗ Skipped')) {
          filesBuilt++;
          await log(msg, { current: filesBuilt, total: totalFiles });
        } else {
          await log(msg);
        }
      }
    );

    await log(`✓ All files written (${primaryFiles.length} files)`);

    // Step 4: Package result
    await log('◆ Packaging...');
    const result = packageResult([{ name: primaryPlugin.name || roleProfile.roleSlug, files: primaryFiles }]);
    await log('✓ Done — your plugin is ready to download');

    await flush({ status: 'complete', result, progress: { current: filesBuilt, total: filesBuilt } });
  } catch (err) {
    await log(`✗ Error: ${err.message}`);
    await flush({ status: 'error', error: err.message });
    console.error('[generate-background] Error:', err);
  }

  // Return value is ignored by Netlify background functions (202 sent automatically)
  return { statusCode: 202 };
};
