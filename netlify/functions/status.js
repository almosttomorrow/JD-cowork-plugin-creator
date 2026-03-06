/**
 * Netlify Function: status
 * GET /api/status?jobId=xxx
 *
 * Returns the current status of a generation job.
 * Reads from /tmp/pluginforge-[jobId].json written by generate-background.
 */

import { readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const jobId = event.queryStringParameters?.jobId;

  if (!jobId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing jobId parameter' }),
    };
  }

  // Sanitize jobId to prevent path traversal
  const safeJobId = jobId.replace(/[^a-zA-Z0-9-]/g, '');
  if (!safeJobId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid jobId' }),
    };
  }

  const filePath = join(tmpdir(), `pluginforge-${safeJobId}.json`);

  if (!existsSync(filePath)) {
    // Job not yet initialized or doesn't exist
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'pending', logs: [] }),
    };
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'pending', logs: [] }),
    };
  }
};
