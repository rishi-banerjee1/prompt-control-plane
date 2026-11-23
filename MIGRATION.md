# Migration Guide: v4/v5.0 → v5.1+

This guide covers migrating from the old `claude-prompt-optimizer-mcp` package to `pcp-engine`.

## npm Package

```bash
# Old
npm install claude-prompt-optimizer-mcp

# New
npm install pcp-engine
```

## Programmatic API

```typescript
// Old
import { optimize } from 'claude-prompt-optimizer-mcp';

// New
import { optimize } from 'pcp-engine';
```

The API surface is identical — only the package name changed.

## MCP Server Configuration

```json
// Old
{
  "mcpServers": {
    "prompt-optimizer": {
      "command": "npx",
      "args": ["-y", "claude-prompt-optimizer-mcp"]
    }
  }
}

// New
{
  "mcpServers": {
    "prompt-control-plane": {
      "command": "npx",
      "args": ["-y", "pcp-engine"]
    }
  }
}
```

## CLI

```bash
# Old
npx claude-prompt-optimizer-mcp check "your prompt"

# New
pcp check "your prompt"
# or
npx pcp-engine check "your prompt"
```

## GitHub Action

```yaml
# Old
- uses: rishiatlan/Prompt-Optimizer-MCP@v5

# New
- uses: rishi-banerjee1/prompt-control-plane@v5
```

## Data Directory

**No change.** Your configuration, usage data, and sessions remain at `~/.prompt-control-plane/`. No data migration needed.

## Scoring Changes in v5.1+

- **Confidence levels** added: `low`, `medium`, `high` — indicates expected improvement magnitude
- **After-scores removed**: compiled output now gets a structural checklist, not a numeric score
- **Free tier**: changed from 10 lifetime uses to 50 per month
