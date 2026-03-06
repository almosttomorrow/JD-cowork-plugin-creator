import { useState, useEffect, useRef, useCallback } from 'react';
import JDInput from './components/JDInput.jsx';
import OptionsPanel from './components/OptionsPanel.jsx';
import ProgressLog from './components/ProgressLog.jsx';
import FileTreePreview from './components/FileTreePreview.jsx';
import DownloadButton from './components/DownloadButton.jsx';
import HowToUse from './components/HowToUse.jsx';
import { startGeneration, pollStatus } from './lib/api.js';

const POLL_INTERVAL = 1500;
const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]{0,9}$/;

export default function App() {
  const [jd, setJd] = useState('');
  const [namespace, setNamespace] = useState('');
  const [author, setAuthor] = useState('');
  const [dual, setDual] = useState(false);

  const [phase, setPhase] = useState('idle'); // idle | generating | complete | error
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const reset = () => {
    stopPolling();
    setPhase('idle');
    setLogs([]);
    setResult(null);
    setErrorMsg('');
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setPhase('generating');
    setLogs([]);
    setResult(null);
    setErrorMsg('');

    let jobId;
    try {
      jobId = await startGeneration({ jd: jd.trim(), namespace: namespace.trim(), author: author.trim(), dual });
    } catch {
      setPhase('error');
      setErrorMsg('Failed to start generation. Check your connection and try again.');
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data = await pollStatus(jobId);
        if (data.logs) setLogs(data.logs);
        if (data.status === 'complete') {
          stopPolling();
          setResult(data.result);
          setPhase('complete');
        } else if (data.status === 'error') {
          stopPolling();
          setPhase('error');
          setErrorMsg(data.error || 'Generation failed — please try again.');
        }
      } catch { /* network blip — keep polling */ }
    }, POLL_INTERVAL);
  };

  const namespaceValid = NAMESPACE_PATTERN.test(namespace.trim());
  const jdReady = jd.trim().length >= 100;
  const canGenerate = jdReady && namespaceValid && phase === 'idle';

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-logo">⬡</span>
          <h1>PluginForge</h1>
        </div>
        <p className="app-tagline">Paste a job description. Get a Claude Code plugin.</p>
      </header>

      <div className="explainer">
        <p>
          <strong>Cowork plugins</strong> add slash commands and domain knowledge to Claude Code — tuned for a
          specific role. PluginForge reads a job description and generates a complete, ready-to-install plugin
          with commands, skills, and connector configs in seconds.
        </p>
      </div>

      <section className="step-section">
        <div className="step-label">
          <span className="step-number">1</span>
          <span>Paste the job description</span>
        </div>
        <div className="panel">
          <JDInput jd={jd} onJdChange={setJd} disabled={phase === 'generating'} />
        </div>
      </section>

      <section className="step-section">
        <div className="step-label">
          <span className="step-number">2</span>
          <span>Configure your plugin</span>
        </div>
        <div className="panel">
          <OptionsPanel
            namespace={namespace}
            author={author}
            dual={dual}
            onNamespaceChange={setNamespace}
            onAuthorChange={setAuthor}
            onDualChange={setDual}
            disabled={phase === 'generating'}
          />
        </div>
      </section>

      <section className="step-section">
        <div className="step-label">
          <span className="step-number">3</span>
          <span>Generate</span>
        </div>

        {phase === 'idle' && (
          <div className="generate-hints">
            <HintRow ok={jdReady} text={jdReady ? 'Job description ready' : 'Paste at least 100 characters'} />
            <HintRow ok={namespaceValid} text={namespaceValid ? `Namespace: /${namespace}:command` : 'Enter a namespace (e.g. sales)'} />
          </div>
        )}

        {phase === 'idle' && (
          <button className="generate-btn" onClick={handleGenerate} disabled={!canGenerate}>
            Generate Plugin
          </button>
        )}

        {phase === 'generating' && (
          <button className="generate-btn generate-btn--loading" disabled>
            <span className="spinner" /> Generating…
          </button>
        )}

        {phase === 'error' && (
          <>
            <div className="error-box">{errorMsg}</div>
            <button className="reset-btn" onClick={reset}>← Try Again</button>
          </>
        )}
      </section>

      {(phase === 'generating' || (logs.length > 0 && phase !== 'error')) && (
        <section className="step-section">
          <div className="step-label">
            <span className="step-number dot" />
            <span>Progress</span>
          </div>
          <ProgressLog logs={logs} running={phase === 'generating'} />
        </section>
      )}

      {phase === 'complete' && result && (
        <section className="step-section">
          <div className="step-label">
            <span className="step-number done">✓</span>
            <span>Plugin ready</span>
          </div>
          <div className="panel result-panel">
            <FileTreePreview result={result} />
            <DownloadButton result={result} />
          </div>
          <HowToUse result={result} namespace={namespace} />
          <button className="reset-btn reset-btn--secondary" onClick={reset}>
            ← Generate another plugin
          </button>
        </section>
      )}
    </div>
  );
}

function HintRow({ ok, text }) {
  return (
    <div className={'hint-row' + (ok ? ' hint-row--ok' : '')}>
      <span className="hint-icon">{ok ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  );
}
