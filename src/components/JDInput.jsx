import { useState } from 'react';
import { fetchUrlContent } from '../lib/api.js';

export default function JDInput({ jd, onJdChange, disabled }) {
  const [mode, setMode] = useState('url'); // 'url' | 'text'
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [urlError, setUrlError] = useState('');

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setUrlError('');
    try {
      const text = await fetchUrlContent(url.trim());
      onJdChange(text);
      setMode('text');
    } catch (err) {
      setUrlError(err.message || 'Could not fetch URL — paste the JD instead.');
    } finally {
      setFetching(false);
    }
  };

  const charCount = jd.length;
  const tooShort = mode === 'text' && jd.length > 0 && jd.length < 100;

  return (
    <div>
      <div className="input-mode">
        <button
          className={'mode-btn' + (mode === 'text' ? ' active' : '')}
          onClick={() => setMode('text')}
          disabled={disabled}
        >
          Paste text
        </button>
        <button
          className={'mode-btn' + (mode === 'url' ? ' active' : '')}
          onClick={() => setMode('url')}
          disabled={disabled}
        >
          Use a URL
        </button>
      </div>

      {mode === 'text' ? (
        <>
          <textarea
            placeholder="Paste the full job description here. Include responsibilities, tools, team structure, and workflows — the more context, the better your assistant will be."
            value={jd}
            onChange={e => onJdChange(e.target.value)}
            disabled={disabled}
            spellCheck={false}
          />
          {tooShort && (
            <div className="field-error">The job description looks a bit short — paste the full text for best results.</div>
          )}
          {charCount > 0 && (
            <div className="char-count">{charCount.toLocaleString()} chars{charCount >= 100 ? ' ✓' : ''}</div>
          )}
        </>
      ) : (
        <>
          <div className="url-input-wrapper">
            <input
              type="url"
              className="url-input"
              placeholder="https://company.com/jobs/role-title"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
              disabled={disabled || fetching}
            />
            <button
              className="url-fetch-btn"
              onClick={handleFetchUrl}
              disabled={!url.trim() || disabled || fetching}
            >
              {fetching ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
          {urlError && <div className="url-error">{urlError}</div>}
          {!urlError && <div className="field-hint">We'll extract the job description text from the page automatically. Switch to "Paste text" to review it first.</div>}
          {jd && (
            <div className="char-count" style={{ marginTop: 8 }}>
              Fetched {jd.length.toLocaleString()} chars ✓
            </div>
          )}
        </>
      )}
    </div>
  );
}
