import { useEffect, useRef } from 'react';

function LogEntry({ line }) {
  if (line.startsWith('✓')) {
    return (
      <div className="log-entry">
        <span className="log-icon-done">✓</span>
        <span className="log-text">{line.slice(1).trim()}</span>
      </div>
    );
  }
  if (line.startsWith('→')) {
    return (
      <div className="log-entry">
        <span className="log-icon-progress">›</span>
        <span className="log-text-muted">{line.slice(1).trim()}</span>
      </div>
    );
  }
  if (line.startsWith('✗')) {
    return (
      <div className="log-entry">
        <span className="log-icon-error">✗</span>
        <span className="log-text">{line.slice(1).trim()}</span>
      </div>
    );
  }
  return (
    <div className="log-entry">
      <span className="log-text-muted">{line}</span>
    </div>
  );
}

export default function ProgressLog({ logs, running }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="progress-log">
      {logs.length === 0 && running && (
        <div className="log-entry">
          <span className="log-icon-progress">›</span>
          <span className="log-text-muted">Starting…</span>
        </div>
      )}
      {logs.map((line, i) => (
        <LogEntry key={i} line={line} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
