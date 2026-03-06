const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]{0,9}$/;

export default function OptionsPanel({
  namespace, author, dual,
  onNamespaceChange, onAuthorChange, onDualChange,
  disabled,
}) {
  const namespaceInvalid = namespace.length > 0 && !NAMESPACE_PATTERN.test(namespace);

  return (
    <div>
      <div className="options-row">
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
            <div className="field-error">Lowercase letters, numbers, hyphens. Max 10 chars.</div>
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
        </div>
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={dual}
          onChange={e => onDualChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-label">
          Generate <strong>companion plugin</strong> for the team they serve
        </span>
      </label>
    </div>
  );
}
