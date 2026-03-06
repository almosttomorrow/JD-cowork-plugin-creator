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
          <label htmlFor="namespace">Namespace</label>
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
            <div className="field-error">Lowercase letters, numbers, hyphens only. Must start with a letter.</div>
          )}
          {showPreview ? (
            <div className="field-preview">/{namespace}:command-name</div>
          ) : (
            <div className="field-desc">Prefix for your plugin's commands</div>
          )}
        </div>

        <div className="field">
          <label htmlFor="author">Author</label>
          <input
            id="author"
            type="text"
            placeholder="your-name"
            value={author}
            onChange={e => onAuthorChange(e.target.value)}
            disabled={disabled}
          />
          <div className="field-desc">Goes into plugin.json metadata</div>
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
            <strong>Generate companion plugin</strong>
            <span>
              Creates a second plugin for the team this person serves — e.g. if the JD is for
              a Sales Enablement Lead, also generate a plugin for their sales reps.
            </span>
          </div>
        </div>
      </label>
    </div>
  );
}
