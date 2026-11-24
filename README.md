# Prompt Control Plane

Prompt Control Plane governs prompts before they reach a model. Its deterministic engine analyzes and scores requests, applies configured policy, and can compile a structured prompt for review, without making LLM calls. Apache-2.0.

Core analysis and generic compilation are model-agnostic. Provider-specific compilation targets, routing, and cost estimates depend on supported targets and a maintained catalog. PCP does not evaluate model outputs.

<video controls width="100%" src="https://raw.githubusercontent.com/rishi-banerjee1/prompt-control-plane/main/assets/pcp-styled-v2.mp4"></video>

## Install

Requires Node.js 20 or later.

```sh
npm install -g github:rishi-banerjee1/prompt-control-plane#v5.4.3
pcp optimize --file prompts/review-auth.md --json
```

The GitHub release is Apache-2.0. The npm update to 5.4 is coming soon; the latest npm release is 5.3.3. Check the [getpcp.site changelog](https://getpcp.site/changelog.html) or [GitHub Releases](https://github.com/rishi-banerjee1/prompt-control-plane/releases) for version updates.

## Use the GitHub Action

```yaml
- uses: rishi-banerjee1/prompt-control-plane@v5.4.3
  with:
    subcommand: optimize
    files: "prompts/review-auth.md"
```

This runs PCP’s full prompt analysis and compilation pipeline, applies configured policy, and returns score, risk, and recommended changes. Use check with a threshold when CI needs a pass/fail gate across prompt files; use preflight for a compact score, risk, and routing summary.

See [`action.yml`](action.yml) for every input and output.

## Use PCP as an MCP server

The MCP server exposes deterministic analysis, policy, compilation, and audit tools. Search the [GitHub MCP Registry](https://github.com/mcp?query=pcp-engine) for its listing. The [onboarding request](https://github.com/github/github-mcp-server/discussions/3934) is submitted and awaits manual curation.

## Use the TypeScript API

```ts
import { analyzePrompt, scorePrompt } from "pcp-engine";

const intent = analyzePrompt("Review the auth module and preserve its public API.");
const score = scorePrompt(intent);
console.log(score.total);
```

## Develop

```sh
npm ci
npm run build
npm test
npm audit --audit-level=moderate
```

- Website: [getpcp.site](https://getpcp.site)
- Security reports: [Security advisories](https://github.com/rishi-banerjee1/prompt-control-plane/security/advisories)
- License: [Apache-2.0](LICENSE)
