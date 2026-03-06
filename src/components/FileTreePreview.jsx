/**
 * Renders a tree-style preview of the generated plugin files.
 */
export default function FileTreePreview({ result }) {
  if (!result?.plugins?.length) return null;

  return (
    <div className="file-tree">
      {result.plugins.map((plugin, pi) => (
        <PluginTree key={pi} plugin={plugin} total={result.plugins.length} />
      ))}
    </div>
  );
}

function PluginTree({ plugin, total }) {
  // Group files by their parent directory
  const dirs = {};
  const rootFiles = [];

  for (const file of plugin.files) {
    const parts = file.path.split('/');
    if (parts.length === 1) {
      rootFiles.push(file.path);
    } else {
      const dir = parts[0];
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push(parts.slice(1).join('/'));
    }
  }

  return (
    <div style={{ marginBottom: total > 1 ? 16 : 0 }}>
      <div className="file-tree-dir">{plugin.name}/</div>
      {rootFiles.map(f => (
        <div key={f} className="file-tree-file">
          <span className="file-tree-indent" />
          ├── <span className="file-name">{f}</span>
        </div>
      ))}
      {Object.entries(dirs).map(([dir, files]) => (
        <div key={dir}>
          <div className="file-tree-file">
            <span className="file-tree-indent" />
            <span style={{ color: 'var(--accent)' }}>├── {dir}/</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
              ({files.length} {files.length === 1 ? 'file' : 'files'})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
