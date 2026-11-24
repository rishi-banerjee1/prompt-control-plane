# Prompt Control Plane

Deterministic prompt governance for any model or provider. PCP scores, validates, compiles, and audits prompts in TypeScript. The engine makes zero LLM calls. Apache-2.0.

<video controls width="100%" src="https://raw.githubusercontent.com/rishi-banerjee1/prompt-control-plane/main/assets/pcp-styled-v2.mp4"></video>

## Install

Requires Node.js 20 or later.

```sh
npm install -g github:rishi-banerjee1/prompt-control-plane#v5.4.1
pcp preflight "Review the auth module. Preserve the public API and add tests." --json
```

The GitHub release is Apache-2.0. The npm update to 5.4 is coming soon; the latest npm release is 5.3.3. Check the [getpcp.site changelog](https://getpcp.site/changelog.html) or [GitHub Releases](https://github.com/rishi-banerjee1/prompt-control-plane/releases) for version updates.

## Use the GitHub Action

```yaml
- uses: rishi-banerjee1/prompt-control-plane@v5.4.1
  with:
    subcommand: preflight
    files: "prompts/**/*.txt"
    threshold: 70
```

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
