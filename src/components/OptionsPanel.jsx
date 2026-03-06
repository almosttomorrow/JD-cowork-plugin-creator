const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]{0,9}$/;

export default function OptionsPanel({
  namespace, author, dual,
  onNamespaceChange, onAuthorChange, onDualChange,
  disabled,
}) {
  const namespaceInvalid = namespace.length > 0 && !NAMESPACE_PATTERN.test(namespace);
  const showPreview = namespace.length > 0 && !namespaceInvalid;

  return (
    <div>
      <div className="options-grid">
        <div className="field">
          <label htmlFor="namespace">Shortcut prefix</label>
          <input
            id="namespace"
            type="text"
            className={namespaceInvalid ? 'invalid' : ''}
            placeholder="sales"
            value={namespace}
            maxLength={10}
            onChange={e => onNamespaceChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            disabled={disabled}
          />
          {namespaceInvalid && (
            <div className="field-error">Use lowercase letters and hyphens only, e.g. "sales".</div>
          )}
          {showPreview ? (
            <div className="field-preview">/{namespace}:command-name</div>
          ) : (
            <div className="field-desc">The word your team types to use this assistant, e.g. "sales"</div>
          )}
        </div>

        <div className="field">
          <label htmlFor="author">Your name</label>
          <input
            id="author"
            type="text"
            placeholder="Jane Smith"
            value={author}
            onChange={e => onAuthorChange(e.target.value)}
            disabled={disabled}
          />
          <div className="field-desc">Optional — added to the assistant for reference</div>
        </div>
      </div>

      <label className="dual-toggle">
        <div className="dual-toggle-row">
          <input
            type="checkbox"
            checked={dual}
            onChange={e => onDualChange(e.target.checked)}
            disabled={disabled}
          />
          <div className="dual-toggle-text">
            <strong>Also build an assistant for their team</strong>
            <span>
              Creates a second assistant for the people this role works with — e.g. for a Sales Enablement Lead,
              also build one for their sales reps.
            </span>
          </div>
        </div>
      </label>
    </div>
  );
}
