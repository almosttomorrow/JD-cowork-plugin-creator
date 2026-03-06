/**
 * Post-download instructions: how to install and start using the plugin.
 */
export default function HowToUse({ result, namespace }) {
  const plugin = result?.plugins?.[0];
  const isDual = result?.plugins?.length > 1;
  const ns = namespace || plugin?.name || 'yourns';
  const exampleCmd = getFirstCommand(plugin);

  return (
    <div className="how-to-use">
      <div className="how-to-use-title">How to install and start using it</div>
      <ol className="how-to-use-steps">
        <li>
          <span className="step-n">1</span>
          <div>
            <strong>Download and unzip the file.</strong>{' '}
            You'll see {isDual ? 'two folders — one for the role and one for their team' : 'a folder'} with everything inside.
          </div>
        </li>
        <li>
          <span className="step-n">2</span>
          <div>
            <strong>Move the folder into Claude Code's plugins directory.</strong>{' '}
            Copy it to <code>~/.claude/plugins/{plugin?.name || 'your-assistant'}/</code> on your computer.
            {' '}(Create the <code>plugins</code> folder if it doesn't exist yet.)
          </div>
        </li>
        <li>
          <span className="step-n">3</span>
          <div>
            <strong>Load it in Claude Code.</strong>{' '}
            Type <code>/plugins:reload</code> in Claude Code, or simply restart the app.
            Your new shortcuts will be ready to use straight away.
          </div>
        </li>
        <li>
          <span className="step-n">4</span>
          <div>
            <strong>Try it out.</strong>{' '}
            Type <code>/{ns}:</code> and press Tab to see all your new shortcuts.
            {exampleCmd && <>{' '}A good one to start with: <code>/{ns}:{exampleCmd}</code>.</>}
          </div>
        </li>
        {isDual && (
          <li>
            <span className="step-n">5</span>
            <div>
              <strong>Share the team assistant too.</strong>{' '}
              Install the second folder the same way and share it with the team.
              They'll get their own set of shortcuts built around how they work.
            </div>
          </li>
        )}
      </ol>
      <div className="how-to-use-note">
        <strong>Connect your tools (optional):</strong> Open <code>CONNECTORS.md</code> inside the folder to see
        which tools — like Google Drive, Salesforce, or Slack — can be linked up. Each one is optional,
        but connecting them makes your assistant significantly more useful.
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
