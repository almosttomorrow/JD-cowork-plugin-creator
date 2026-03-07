import { useState, useEffect, useRef, useCallback } from 'react';
import JDInput from './components/JDInput.jsx';
import OptionsPanel from './components/OptionsPanel.jsx';
import ProgressLog from './components/ProgressLog.jsx';
import FileTreePreview from './components/FileTreePreview.jsx';
import DownloadButton from './components/DownloadButton.jsx';
import HowToUse from './components/HowToUse.jsx';
import PluginSummary from './components/PluginSummary.jsx';
import { startGeneration, pollStatus } from './lib/api.js';

const POLL_INTERVAL = 1500;
const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]{0,9}$/;

export default function App() {
  const [jd, setJd] = useState('');
  const [namespace, setNamespace] = useState('');
  const [author, setAuthor] = useState('');

  const [phase, setPhase] = useState('idle'); // idle | generating | complete | error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(null); // { current, total } | null
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
    setProgress(null);
    setResult(null);
    setErrorMsg('');
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setPhase('generating');
    setLogs([]);
    setProgress(null);
    setResult(null);
    setErrorMsg('');

    let jobId;
    try {
      jobId = await startGeneration({ jd: jd.trim(), namespace: namespace.trim(), author: author.trim() });
    } catch {
      setPhase('error');
      setErrorMsg('Failed to start generation. Check your connection and try again.');
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data = await pollStatus(jobId);
        if (data.logs) setLogs(data.logs);
        if (data.progress) setProgress(data.progress);
        if (data.status === 'complete') {
          stopPolling();
          setResult(data.result);
          setPhase('complete');
        } else if (data.status === 'error') {
          stopPolling();
          setPhase('error');
          setErrorMsg(data.error || 'Generation failed. Please try again.');
        }
      } catch { /* network blip, keep polling */ }
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
          a personalised AI assistant with shortcuts, role knowledge, and tool connections that your
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
            onNamespaceChange={setNamespace}
            onAuthorChange={setAuthor}
            disabled={phase === 'generating'}
          />
        </div>
      </section>

      <section className="step-section">
        <div className="step-label">
          <span className={`step-number${phase === 'generating' ? ' dot' : ''}`}>
            {phase === 'generating' ? '' : '3'}
          </span>
          <span>{phase === 'generating' ? 'Building your plugin...' : 'Build your plugin'}</span>
        </div>

        {phase === 'idle' && (
          <div className="generate-hints">
            <HintRow ok={jdReady} text={jdReady ? 'Job description ready' : 'Add the job description above (step 1)'} />
            <HintRow ok={namespaceValid} text={namespaceValid ? `Shortcut prefix set: /${namespace}:...` : 'Choose a shortcut prefix above (step 2)'} />
          </div>
        )}

        {phase === 'idle' && (
          <button className="generate-btn" onClick={handleGenerate} disabled={!canGenerate}>
            Build Plugin
          </button>
        )}

        {phase === 'generating' && (
          <>
            <button className="generate-btn generate-btn--loading" disabled>
              <span className="spinner" /> Building plugin...
            </button>
            <div style={{ marginTop: 16 }}>
              <ProgressLog logs={logs} running={true} progress={progress} />
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="error-box">{errorMsg}</div>
            <button className="reset-btn" onClick={reset}>Try Again</button>
          </>
        )}
      </section>

      {phase === 'complete' && result && (
        <section className="step-section">
          <div className="step-label">
            <span className="step-number done">✓</span>
            <span>Your plugin is ready</span>
          </div>
          <PluginSummary result={result} namespace={namespace} />
          <DownloadButton result={result} />
          <div className="panel result-panel" style={{ marginTop: 16 }}>
            <FileTreePreview result={result} />
          </div>
          <HowToUse result={result} namespace={namespace} />
          <button className="reset-btn reset-btn--secondary" onClick={reset}>
            Build another plugin
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
