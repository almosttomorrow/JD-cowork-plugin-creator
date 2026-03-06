/**
 * Starts plugin generation. Returns a jobId immediately.
 * The frontend polls /api/status?jobId=xxx for progress.
 */
export async function startGeneration({ jd, namespace, author, dual }) {
  const jobId = crypto.randomUUID();

  // Fire the request — background function returns 202 with no body
  await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd, namespace, author, dual, jobId }),
  });

  return jobId;
}

/**
 * Polls the status of a generation job.
 * Returns { status, logs, result, error }.
 */
export async function pollStatus(jobId) {
  const response = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    throw new Error(`Status poll failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches text content from a URL via the server-side proxy.
 */
export async function fetchUrlContent(url) {
  const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: 'Could not fetch URL' }));
    throw new Error(error || 'Could not fetch URL');
  }
  const { text } = await response.json();
  return text;
}
