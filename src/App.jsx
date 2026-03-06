import { useState, useEffect, useRef, useCallback } from 'react';
import JDInput from './components/JDInput.jsx';
import OptionsPanel from './components/OptionsPanel.jsx';
import GenerateButton from './components/GenerateButton.jsx';
import ProgressLog from './components/ProgressLog.jsx';
import FileTreePreview from './components/FileTreePreview.jsx';
import DownloadButton from './components/DownloadButton.jsx';
import { startGeneration, pollStatus } from './lib/api.js';

const POLL_INTERVAL = 1500;

export default function App() {
  const [jd, setJd] = useState('');
  const [namespace, setNamespace] = useState('');
  const [author, setAuthor] = useState('');
  const [dual, setDual] = useState(false);

  const [phase, setPhase] = useState('idle'); // 'idle' | 'generating' | 'complete' | 'error'
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pollRef = useRef(null);
  const jobIdRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleGenerate = async () => {
    if (!jd.trim() || !namespace.trim()) return;

    setPhase('generating');
    setLogs([]);
    setResult(null);
    setErrorMsg('');

    let jobId;
    try {
      jobId = await startGeneration({ jd: jd.trim(), namespace: namespace.trim(), author: author.trim(), dual });
      jobIdRef.current = jobId;
    } catch (err) {
      setPhase('error');
      setErrorMsg('Failed to start generation. Check your connection and try again.');
      return;
    }

    // Start polling
    pollRef.current = setInterval(async () => {
      try {
        const data = await pollStatus(jobId);

        if (data.logs) {
          setLogs(data.logs);
        }

        if (data.status === 'complete') {
          stopPolling();
          setResult(data.result);
          setPhase('complete');
        } else if (data.status === 'error') {
          stopPolling();
          setPhase('error');
          setErrorMsg(data.error || 'Generation failed — please try again.');
        }
      } catch (err) {
        // Network blip — keep polling
        console.warn('Poll error:', err.message);
      }
    }, POLL_INTERVAL);
  };

  const canGenerate = jd.trim().length >= 100 && namespace.trim().length > 0 && phase !== 'generating';

  return (
    <div className="app">
      <header className="header">
        <h1>PluginForge</h1>
        <p>Paste a job description. Get a plugin.</p>
      </header>

      <div className="panel">
        <JDInput jd={jd} onJdChange={setJd} disabled={phase === 'generating'} />
        <div className="divider" />
        <OptionsPanel
          namespace={namespace}
          author={author}
          dual={dual}
          onNamespaceChange={setNamespace}
          onAuthorChange={setAuthor}
          onDualChange={setDual}
          disabled={phase === 'generating'}
        />
        <GenerateButton onClick={handleGenerate} disabled={!canGenerate} loading={phase === 'generating'} />
      </div>

      {(phase === 'generating' || logs.length > 0) && (
        <div className="panel">
          <div className="panel-title">Progress</div>
          <ProgressLog logs={logs} running={phase === 'generating'} />
        </div>
      )}

      {phase === 'error' && errorMsg && (
        <div className="panel">
          <div className="error-box">{errorMsg}</div>
        </div>
      )}

      {phase === 'complete' && result && (
        <div className="panel">
          <div className="panel-title">Files generated</div>
          <FileTreePreview result={result} />
          <DownloadButton result={result} />
        </div>
      )}
    </div>
  );
}
