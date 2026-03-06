/**
 * Shows the full file tree of generated plugins.
 */
export default function FileTreePreview({ result }) {
  if (!result?.plugins?.length) return null;

  const multiPlugin = result.plugins.length > 1;
  const firstName = result.plugins[0].name;

  return (
    <div className="file-tree">
      {multiPlugin && (
        <div className="tree-line">
          <span className="tree-dir">{firstName}-plugins/</span>
        </div>
      )}
      {result.plugins.map((plugin, pi) => (
        <PluginTree
          key={pi}
          plugin={plugin}
          indent={multiPlugin ? '    ' : ''}
          isLast={pi === result.plugins.length - 1}
          showSep={multiPlugin && pi < result.plugins.length - 1}
        />
      ))}
    </div>
  );
}

function PluginTree({ plugin, indent, showSep }) {
  // Organise files: group by first path segment
  const groups = {};
  for (const file of plugin.files) {
    const parts = file.path.split('/');
    const key = parts.length > 1 ? parts[0] : '__root__';
    if (!groups[key]) groups[key] = [];
    groups[key].push({ name: parts.slice(1).join('/') || parts[0], full: file.path });
  }

  // Render order: root files first, then dirs
  const rootFiles = groups['__root__'] || [];
  const dirs = Object.entries(groups).filter(([k]) => k !== '__root__');

  const all = [
    ...rootFiles.map(f => ({ type: 'file', name: f.name })),
    ...dirs.map(([dir, files]) => ({ type: 'dir', name: dir, files })),
  ];

  return (
    <>
      <div className="tree-line" style={{ marginTop: indent ? 4 : 0 }}>
        <span className="tree-prefix">{indent}</span>
        <span className="tree-dir">{plugin.name}/</span>
      </div>
      {all.map((item, i) => {
        const isLast = i === all.length - 1;
        const prefix = indent + (isLast ? '└── ' : '├── ');
        if (item.type === 'file') {
          return (
            <div key={item.name} className="tree-line">
              <span className="tree-prefix">{prefix}</span>
              <span className="tree-file"><span className="tree-file-name">{item.name}</span></span>
            </div>
          );
        }
        // Directory
        return (
          <div key={item.name}>
            <div className="tree-line">
              <span className="tree-prefix">{prefix}</span>
              <span className="tree-dir">{item.name}/</span>
            </div>
            {item.files.map((f, fi) => {
              const childPrefix = indent + (isLast ? '    ' : '│   ') + (fi === item.files.length - 1 ? '└── ' : '├── ');
              return (
                <div key={f.full} className="tree-line">
                  <span className="tree-prefix">{childPrefix}</span>
                  <span className="tree-file"><span className="tree-file-name">{f.name}</span></span>
                </div>
              );
            })}
          </div>
        );
      })}
      {showSep && <div className="tree-plugin-sep" />}
    </>
  );
}
