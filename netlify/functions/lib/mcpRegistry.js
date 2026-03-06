export const MCP_REGISTRY = {
  'google-drive':    'https://drive.mcp.claude.com/mcp',
  'google-calendar': 'https://gcal.mcp.claude.com/mcp',
  'google-docs':     'https://docs.mcp.claude.com/mcp',
  'gong':            'https://mcp.gong.io/mcp',
  'salesforce':      'https://sfdc.mcp.salesforce.com/mcp',
  'github':          'https://api.githubcopilot.com/mcp',
  'slack':           'https://mcp.slack.com/mcp',
  'notion':          'https://mcp.notion.so/mcp',
  'jira':            'https://mcp.atlassian.com/mcp',
  'confluence':      'https://mcp.atlassian.com/mcp',
  'hubspot':         'https://mcp.hubspot.com/mcp',
  'linear':          'https://mcp.linear.app/mcp',
  'figma':           'https://mcp.figma.com/mcp',
  'snowflake':       'https://mcp.snowflake.com/mcp',
  'looker':          'https://mcp.looker.com/mcp',
  'tableau':         'https://mcp.tableau.com/mcp',
};

export const TOOL_ALIASES = {
  'drive':    'google-drive',
  'gdrive':   'google-drive',
  'gcal':     'google-calendar',
  'calendar': 'google-calendar',
  'sfdc':     'salesforce',
  'gh':       'github',
};

/**
 * Resolves a connector name (handling aliases) to a registry key.
 * Returns the registry key if found, null otherwise.
 */
export function resolveConnector(name) {
  const normalized = name.toLowerCase().trim();
  if (MCP_REGISTRY[normalized]) return normalized;
  if (TOOL_ALIASES[normalized]) return TOOL_ALIASES[normalized];
  return null;
}

/**
 * Returns the MCP URL for a connector key, or null if not in registry.
 */
export function getMcpUrl(connectorKey) {
  return MCP_REGISTRY[connectorKey] || null;
}
