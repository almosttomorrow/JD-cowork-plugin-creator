/**
 * Post-download instructions: how to install and start using the plugin.
 */
export default function HowToUse({ result, namespace }) {
  const plugin = result?.plugins?.[0];
  const isDual = result?.plugins?.length > 1;
  const ns = namespace || plugin?.name || 'yourns';
  // Find first command name as an example
  const exampleCmd = getFirstCommand(plugin);

  return (
    <div className="how-to-use">
      <div className="how-to-use-title">How to install your plugin</div>
      <ol className="how-to-use-steps">
        <li>
          <span className="step-n">1</span>
          <div>
            <strong>Unzip the download.</strong>{' '}
            You'll get {isDual ? 'two plugin folders' : 'a plugin folder'} —
            {' '}<code>{plugin?.name || 'role-slug'}/</code>{isDual ? ' and a companion' : ''}.
          </div>
        </li>
        <li>
          <span className="step-n">2</span>
          <div>
            <strong>Move it to your Claude Code plugins directory.</strong>{' '}
            The standard path is{' '}
            <code>~/.claude/plugins/{plugin?.name || 'role-slug'}/</code>.
            If the directory doesn't exist, create it.
          </div>
        </li>
        <li>
          <span className="step-n">3</span>
          <div>
            <strong>Load the plugin.</strong>{' '}
            In Claude Code, run <code>/plugins:reload</code> (or restart the app).
            Your new commands will be available immediately.
          </div>
        </li>
        <li>
          <span className="step-n">4</span>
          <div>
            <strong>Try your first command.</strong>{' '}
            Type <code>/{ns}:</code> and press Tab to see all available commands.
            {exampleCmd && <>{' '}Start with <code>/{ns}:{exampleCmd}</code>.</>}
          </div>
        </li>
        {isDual && (
          <li>
            <span className="step-n">5</span>
            <div>
              <strong>Install the companion plugin too.</strong>{' '}
              Move the companion folder to the same plugins directory and reload.
              Share it with the team who'll use it.
            </div>
          </li>
        )}
      </ol>
      <div className="how-to-use-note">
        <strong>Connectors (optional):</strong> Check <code>CONNECTORS.md</code> in your plugin
        to connect tools like Google Drive, Salesforce, or Gong. Each connector is optional —
        commands work without them, but become much more powerful when connected.
      </div>
    </div>
  );
}

function getFirstCommand(plugin) {
  if (!plugin?.files) return null;
  const cmd = plugin.files.find(f => f.path.startsWith('commands/') && f.path.endsWith('.md'));
  if (!cmd) return null;
  return cmd.path.replace('commands/', '').replace('.md', '');
}
