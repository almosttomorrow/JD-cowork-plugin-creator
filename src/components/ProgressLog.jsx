import { useEffect, useRef } from 'react';

function LogEntry({ line }) {
  // Step header:  ◆ Connecting to OpenAI...
  if (line.startsWith('◆')) {
    return (
      <div className="log-entry log-entry--step">
        <span className="log-icon-step">◆</span>
        <span className="log-text-step">{line.slice(1).trim()}</span>
      </div>
    );
  }
  // Sub-item:  · Writing commands/brief.md
  if (line.startsWith('  ·') || line.startsWith('· ')) {
    const text = line.replace(/^[\s·]+/, '');
    return (
      <div className="log-entry log-entry--sub">
        <span className="log-icon-sub">·</span>
        <span className="log-text-muted">{text}</span>
      </div>
    );
  }
  // Done: ✓ Role identified
  if (line.startsWith('✓')) {
    return (
      <div className="log-entry">
        <span className="log-icon-done">✓</span>
        <span className="log-text">{line.slice(1).trim()}</span>
      </div>
    );
  }
  // Working: → Parsing...
  if (line.startsWith('→')) {
    return (
      <div className="log-entry">
        <span className="log-icon-progress">›</span>
        <span className="log-text-muted">{line.slice(1).trim()}</span>
      </div>
    );
  }
  // Error: ✗ Failed
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
  const containerRef = useRef(null);

  // Scroll within the log box only — never force page scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="progress-log" ref={containerRef}>
      {logs.length === 0 && running && (
        <div className="log-entry">
          <span className="log-icon-step">◆</span>
          <span className="log-text-step">Starting up...</span>
        </div>
      )}
      {logs.map((line, i) => (
        <LogEntry key={i} line={line} />
      ))}
    </div>
  );
}
