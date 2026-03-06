/**
 * Post-generation explainer card.
 * Parses the generated files and presents a business-friendly summary:
 * what was built, what each shortcut does, and what tools are connected.
 */
export default function PluginSummary({ result, namespace }) {
  const plugin = result?.plugins?.[0];
  if (!plugin) return null;

  const { files = [] } = plugin;
  const ns = namespace || plugin.name || 'plugin';

  // Parse plugin description from plugin.json
  const description = getPluginDescription(files);

  // Extract commands with their one-line descriptions from YAML frontmatter
  const commands = getCommands(files);

  // Skill names (used for "areas of knowledge" count/labels)
  const skills = getSkillNames(files);

  // Connector names from .mcp.json
  const connectors = getConnectors(files);

  return (
    <div className="plugin-summary">
      <div className="plugin-summary-header">
        <div className="plugin-summary-title">Here is what we built</div>
        {description && <p className="plugin-summary-desc">{description}</p>}
      </div>

      {commands.length > 0 && (
        <div className="plugin-summary-section">
          <div className="plugin-summary-section-label">Your shortcuts</div>
          <div className="command-list">
            {commands.map(cmd => (
              <div key={cmd.name} className="command-row">
                <span className="command-prefix">/{ns}:{cmd.name}</span>
                {cmd.desc && <span className="command-desc">{cmd.desc}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(skills.length > 0 || connectors.length > 0) && (
        <div className="plugin-summary-meta">
          {skills.length > 0 && (
            <span className="meta-tag meta-tag--knowledge">
              {skills.length} area{skills.length !== 1 ? 's' : ''} of built-in knowledge
            </span>
          )}
          {connectors.length > 0 ? (
            connectors.map(c => (
              <span key={c} className="meta-tag meta-tag--connector">
                {formatConnectorName(c)} ready to connect
              </span>
            ))
          ) : (
            <span className="meta-tag meta-tag--standalone">Works standalone, no tool setup needed</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function getPluginDescription(files) {
  const f = files.find(f => f.path === '.claude-plugin/plugin.json');
  if (!f) return '';
  try {
    return JSON.parse(f.content)?.description || '';
  } catch {
    return '';
  }
}

function getCommands(files) {
  return files
    .filter(f => f.path.startsWith('commands/') && f.path.endsWith('.md'))
    .map(f => {
      const name = f.path.replace('commands/', '').replace('.md', '');
      const desc = f.content.match(/^description:\s*(.+)$/m)?.[1]?.trim() || '';
      return { name, desc };
    });
}

function getSkillNames(files) {
  return files
    .filter(f => f.path.includes('/SKILL.md'))
    .map(f => f.path.split('/')[1]);
}

function getConnectors(files) {
  const f = files.find(f => f.path === '.mcp.json');
  if (!f) return [];
  try {
    const mcp = JSON.parse(f.content);
    return Object.keys(mcp.mcpServers || {});
  } catch {
    return [];
  }
}

function formatConnectorName(key) {
  // "google-drive" → "Google Drive", "salesforce" → "Salesforce"
  return key
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
