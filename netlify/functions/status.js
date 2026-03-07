/**
 * Netlify Function: status
 * GET /api/status?jobId=xxx
 *
 * Returns the current status of a generation job.
 * Reads from Netlify Blobs written by generate-background.
 */

import { getStore } from '@netlify/blobs';

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

  try {
    const store = getStore('plugin-status');
    const data = await store.get(safeJobId, { type: 'json' });

    if (!data) {
      // Job not yet initialized or doesn't exist
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'pending', logs: [] }),
      };
    }

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
