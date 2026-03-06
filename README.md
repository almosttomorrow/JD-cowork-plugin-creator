# PluginForge

**Paste a job description. Get a Claude Code plugin.**

PluginForge is a web app that reads a job description and generates a complete, ready-to-install [Cowork plugin](https://github.com/anthropics/claude-code) — with slash commands, domain-knowledge skills, connector configs, and a README — in seconds.

## What it generates

For a given role, PluginForge produces:

```
[role-slug]/
├── .claude-plugin/plugin.json   # Plugin metadata
├── .mcp.json                    # MCP connector URLs
├── CONNECTORS.md                # How to set up each connector
├── README.md                    # Plugin usage guide
├── commands/                    # 5–8 slash commands (one file each)
│   ├── prep-call.md
│   └── draft-brief.md
└── skills/                      # 3–5 domain knowledge files
    ├── compliance-frameworks/SKILL.md
    └── pricing-model/SKILL.md
```

If **companion plugin** is enabled, it also generates a second plugin for the team the role serves (e.g. a Sales Enablement Lead → also generates a plugin for their sales reps).

## Tech stack

| Layer    | Choice                        |
|----------|-------------------------------|
| Frontend | React + Vite                  |
| Hosting  | Netlify (static)              |
| Backend  | Netlify Background Functions  |
| AI       | Anthropic SDK, `claude-sonnet-4-6` |
| ZIP      | JSZip (in-browser)            |
| Styling  | Plain CSS                     |

## Local development

**Prerequisites:** Node 18+, a Netlify account, an Anthropic API key.

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
# In Netlify dashboard → Site settings → Environment variables, add:
#   ANTHROPIC_API_KEY = sk-ant-...
#
# For local dev, create a .env file:
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# 3. Start the dev server (runs both Vite and Netlify Functions)
npm run dev
# Opens at http://localhost:8888
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key — set in Netlify dashboard under Environment Variables |

The Anthropic SDK reads `ANTHROPIC_API_KEY` automatically. No other configuration is needed.

## Deploy to Netlify

```bash
# Option A: connect your repo in the Netlify dashboard (recommended)
# Build command:  npm run build
# Publish dir:    dist
# Functions dir:  netlify/functions

# Option B: CLI
npm install -g netlify-cli
netlify deploy --prod
```

Set `ANTHROPIC_API_KEY` in **Netlify dashboard → Site configuration → Environment variables** before deploying.

## How it works

The backend runs a four-step pipeline in a Netlify Background Function (up to 15 min):

1. **Parse JD** — Claude extracts role title, responsibilities, tools, workflows from the JD text
2. **Design schema** — Claude designs the full plugin structure (which commands, which skills, which connectors)
3. **Generate files** — one Claude call per command file, skill file, CONNECTORS.md, and README
4. **Package** — assembles a JSON response the frontend uses to build the ZIP

The frontend polls `/api/status?jobId=xxx` every 1.5 seconds and shows live progress as each file is generated.

## Project structure

```
├── netlify.toml                       # Build + redirect config
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── App.jsx                        # Main state machine + layout
│   ├── components/
│   │   ├── JDInput.jsx                # Paste / fetch-from-URL toggle
│   │   ├── OptionsPanel.jsx           # Namespace, author, dual toggle
│   │   ├── ProgressLog.jsx            # Live log (polls every 1.5s)
│   │   ├── FileTreePreview.jsx        # Generated file tree
│   │   ├── DownloadButton.jsx         # JSZip → browser download
│   │   └── HowToUse.jsx              # Post-download install steps
│   ├── lib/api.js                     # startGeneration(), pollStatus()
│   └── styles/main.css
└── netlify/functions/
    ├── generate-background.js         # Background function entry point
    ├── status.js                      # Reads /tmp/[jobId].json
    ├── fetch-url.js                   # Proxy for URL → text extraction
    └── lib/
        ├── parseJD.js                 # Step 1: JD → role profile
        ├── designSchema.js            # Step 2: role profile → plugin schema
        ├── generateFiles.js           # Step 3: schema → file contents
        ├── packageResult.js           # Step 4: assemble response
        ├── mcpRegistry.js             # Known MCP server URLs
        └── prompts.js                 # All Claude prompt templates
```

## What's not in scope (v1)

- Auth / user accounts
- Saving or browsing past generations
- Editing generated files in the browser
- GitHub push integration
- Custom connector URL entry
