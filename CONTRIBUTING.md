# Contributing to PCP

## Quick Start

```bash
git clone https://github.com/rishi-banerjee1/prompt-control-plane.git
cd prompt-control-plane
npm ci
npm run build
npm test
```

## Development Workflow

1. Create a feature branch from `main`
2. Make changes in `src/`
3. Run `npm run build` to compile TypeScript
4. Run `npm test` to verify the full suite passes
5. Run `npx tsc --noEmit` for type checking
6. Submit a pull request

## Project Structure

```
src/
├── index.ts          # MCP server entry point
├── lint-cli.ts       # CLI entry point (pcp command)
├── api.ts            # Programmatic API exports
├── tools.ts          # MCP tool registrations (20 tools)
├── analyzer.ts       # Intent decomposition
├── compiler.ts       # Prompt compilation
├── scorer.ts         # Quality scoring (0-100)
├── estimator.ts      # Cost estimation & model routing
├── rules.ts          # Built-in quality rules (14)
├── customRules.ts    # User-defined rules
├── constants.ts      # Shared constants
├── types.ts          # TypeScript type definitions
├── tokenizer.ts      # Token counting utilities
├── templates.ts      # Prompt templates
├── preservePatterns.ts # Pattern preservation during optimization
├── zones.ts          # Zone-based prompt segmentation
├── storage/
│   ├── index.ts      # Storage barrel export
│   ├── interface.ts  # Storage abstraction
│   └── localFs.ts    # File-based implementation
├── license.ts        # Ed25519 license validation
├── auditLog.ts       # Hash-chained audit trail
├── policy.ts         # Policy enforcement
├── session.ts        # Session management
├── sessionHistory.ts # Session history tracking
├── rateLimit.ts      # Rate limiting
├── logger.ts         # Structured logging
├── sort.ts           # Deterministic sorting utilities
├── profiles.ts       # Optimization profiles
├── pruner.ts         # Tool pruning logic
└── deltas.ts         # Compression delta calculations

test/
├── *.test.ts         # TypeScript unit and integration tests
├── fixtures/         # Test fixture files
└── helpers/          # Test helper utilities

docs/
├── index.html        # Landing page (getpcp.site)
├── docs.html         # Documentation
├── features.html     # Feature details
└── ...               # Other website pages
```

## Testing

Tests use Node.js built-in test runner (`node --test`):

```bash
npm test                           # Run all tests
node --test dist/test/scorer.test.js  # Run specific test file
```

## Code Style

- TypeScript with `strict: true`
- ESM modules (`"type": "module"`)
- No default exports -- use named exports
- Sort arrays deterministically (alphabetical) for reproducible outputs
- All public functions must handle errors gracefully (no throws to MCP clients)

## Key Invariants

1. **Deterministic** -- Same input must produce same output. No `Math.random()`, no `Date.now()` in scoring logic.
2. **Zero network calls** -- The core pipeline never makes HTTP requests.
3. **Privacy-first** -- Never log raw prompt content unless explicitly opted in via `PROMPT_CONTROL_PLANE_LOG_PROMPTS=true`.
4. **Fail-safe** -- Storage/filesystem errors must not crash the server.

## Recognition

All contributors are recognized:
- **Contributors Wall** on the [PCP website](https://getpcp.site) & Github Repo — auto-updated from GitHub
- **Named credit** in the changelog for every merged PR
- **Co-author tag** in commit messages

We believe in giving credit where it's due. Your contribution matters.

## License

Apache License 2.0 -- see [LICENSE](./LICENSE). All governance features are included; no commercial license is required to use or modify the software.
