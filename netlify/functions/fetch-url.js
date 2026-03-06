/**
 * Netlify Function: fetch-url
 * GET /api/fetch-url?url=https://...
 *
 * Fetches the content of a URL and extracts readable text.
 * Used by the frontend URL input mode to pull JD text from a job listing page.
 */

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing url parameter' }),
    };
  }

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs are supported');
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Invalid URL: ${err.message}` }),
    };
  }

  try {
    const response = await fetch(parsedUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PluginForge/1.0)',
        'Accept': 'text/html,text/plain',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: `Could not fetch URL — server returned ${response.status}` }),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    let text;
    if (contentType.includes('text/html')) {
      text = htmlToText(rawText);
    } else {
      text = rawText;
    }

    // Trim to reasonable size
    if (text.length > 50000) {
      text = text.slice(0, 50000);
    }

    if (text.trim().length < 50) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: 'Could not extract text from URL — paste the JD instead.' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: text.trim() }),
    };
  } catch (err) {
    return {
      statusCode: 422,
      headers,
      body: JSON.stringify({ error: 'Could not fetch URL — paste the JD instead.' }),
    };
  }
};

/**
 * Strips HTML tags and normalises whitespace to extract readable text.
 */
function htmlToText(html) {
  return html
    // Remove script and style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    // Convert block elements to newlines
    .replace(/<\/(p|div|li|h[1-6]|section|article|header|footer|main|aside|tr|td|th)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
