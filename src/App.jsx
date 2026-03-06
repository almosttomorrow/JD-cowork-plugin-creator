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
        <p className="app-tagline">Turn any job description into a ready-to-use AI assistant for Claude Code.</p>
      </header>

      <div className="explainer">
        <p>
          <strong>How it works:</strong> Paste a job description (or link to one) and PluginForge builds
          a personalised AI assistant — with shortcuts, role knowledge, and tool connections — that your
          team can install in Claude Code and start using straight away. No coding needed.
        </p>
      </div>

      <section className="step-section">
        <div className="step-label">
          <span className="step-number">1</span>
          <span>Add the job description</span>
        </div>
        <div className="panel">
          <JDInput jd={jd} onJdChange={setJd} disabled={phase === 'generating'} />
        </div>
      </section>

      <section className="step-section">
        <div className="step-label">
          <span className="step-number">2</span>
          <span>Name your assistant</span>
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
          <span>Build your assistant</span>
        </div>

        {phase === 'idle' && (
          <div className="generate-hints">
            <HintRow ok={jdReady} text={jdReady ? 'Job description ready' : 'Add the job description above (step 1)'} />
            <HintRow ok={namespaceValid} text={namespaceValid ? `Shortcut prefix set: /${namespace}:…` : 'Choose a shortcut prefix above (step 2)'} />
          </div>
        )}

        {phase === 'idle' && (
          <button className="generate-btn" onClick={handleGenerate} disabled={!canGenerate}>
            Build My Assistant
          </button>
        )}

        {phase === 'generating' && (
          <button className="generate-btn generate-btn--loading" disabled>
            <span className="spinner" /> Building your assistant…
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
            <span>Building…</span>
          </div>
          <ProgressLog logs={logs} running={phase === 'generating'} />
        </section>
      )}

      {phase === 'complete' && result && (
        <section className="step-section">
          <div className="step-label">
            <span className="step-number done">✓</span>
            <span>Your assistant is ready</span>
          </div>
          <div className="panel result-panel">
            <FileTreePreview result={result} />
            <DownloadButton result={result} />
          </div>
          <HowToUse result={result} namespace={namespace} />
          <button className="reset-btn reset-btn--secondary" onClick={reset}>
            ← Build another assistant
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
