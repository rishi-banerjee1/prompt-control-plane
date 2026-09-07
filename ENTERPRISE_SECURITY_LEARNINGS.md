# Enterprise Security Audit Learnings

This document captures the operational learnings from the enterprise audit-readiness hardening pass for Prompt Control Plane. It is meant to be used as a future reference before CISO reviews, enterprise procurement reviews, dependency remediation passes, Cloudflare deployments, and GitHub branch-protection changes.

Prompt Control Plane has two distinct security surfaces:

- The PCP engine and package: deterministic TypeScript runtime, CLI, MCP server, API, GitHub Action, tests, dependencies, release artifacts, and local storage model.
- The product website: static HTML/CSS/JS under `docs/`, deployed through Cloudflare Pages to `https://getpcp.site`.

Do not treat website hardening as sufficient. The engine is the product. Website DAST is necessary, but repository-level controls must also cover source, tests, workflows, dependency trees, package metadata, and release paths.

## Bar-Raiser Summary

Primary metric: can an enterprise reviewer see repeatable, enforced, auditable evidence that every development path is blocked by security gates?

Readiness rating after this pass: `4 = Exceptional` for repository-level engineering controls.

Important boundary: this repository can be made audit-ready and mapped to ISO 27001 and SOC 2 engineering controls, but code changes alone do not create ISO certification or SOC 2 compliance. Formal compliance also requires organizational evidence: access reviews, policy attestations, risk register, vendor management, incident response, personnel onboarding/offboarding, change-management evidence, and independent audit reports.

## Core Security Invariants

Keep these invariants explicit in code, docs, tests, and enterprise responses:

- Zero LLM calls inside the PCP engine.
- Zero telemetry from the engine.
- Zero network calls from the deterministic engine runtime.
- No prompt logging by default.
- Raw prompts are not persisted unless explicitly opted in.
- Security claims must be backed by tests or CI evidence.
- Live-site claims must be backed by deployed Cloudflare Pages behavior, not local files alone.
- Model-support claims must be validated through engine tests and docs updates before publication.
- CI gates must fail closed. Skipping a security check silently is a security failure.

## What Was Hardened

### Engine and Repository Controls

The security program now covers the PCP engine, not only the website:

- TypeScript build and test suite run in CI across supported Node versions.
- CodeQL runs with JavaScript/TypeScript analysis.
- Deterministic SAST scans production code and docs scripts for unsafe browser and code-execution patterns.
- Secret scanning checks high-confidence credential patterns across source, docs, scripts, tests, GitHub workflows, and nested packages.
- Root package audit is enforced with `npm audit --audit-level=moderate`.
- Nested `video-explainer` package audit is enforced separately.
- Dependency Review blocks risky dependency diffs.
- CycloneDX SBOMs are generated for both root and nested dependency trees.
- GitHub Actions are pinned to immutable commit SHAs and checked by SAST.
- CODEOWNERS maps sensitive repository surfaces.
- Branch protection requires security checks and review gates on `main`.

### Website Controls

The Cloudflare-hosted static site now has enforced browser-surface protections:

- Strict security headers in `docs/_headers`.
- CSP baseline with `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`.
- No inline scripts or event-handler attributes.
- Inline styles and style attributes externalized into same-origin CSS files.
- DAST checks validate live security headers and CSP expectations.
- ZAP baseline scan runs against `https://getpcp.site` in CI.
- Cache-busted CSS and JS references reduce stale asset ambiguity during review.

### GitHub and Governance Controls

GitHub became part of the security surface:

- Required checks on `main`: Node tests, Enterprise Security Gates, CodeQL, and Dependency Review.
- Admin enforcement disabled so repository admins have an explicit solo-maintainer pass-through after checks are green.
- Linear history required.
- Force pushes and branch deletion disabled.
- Pull-request reviews required by default.
- Stale reviews dismissed.
- Code owner review required.
- Last-push approval required.

For a solo repo, the review requirement can block urgent merges. If there is no independent reviewer and the owner explicitly approves an admin bypass, use the admin-pass-through procedure below. Keep required checks enabled.

## Security Gates

The repo-level command is:

```bash
npm run security:all
```

This runs:

- root dependency audit
- nested `video-explainer` dependency audit
- deterministic SAST
- DAST-style header and CSP validation
- ZAP baseline scan
- HTML parser security tests

For local live-site verification:

```bash
DAST_BASE_URL=https://getpcp.site npm run security:dast
```

For ZAP live-site verification:

```bash
ZAP_BASE_URL=https://getpcp.site npm run security:zap
```

Expected behavior:

- In CI, missing `DAST_BASE_URL` or `ZAP_BASE_URL` must fail.
- Outside CI, ZAP may skip only when no target is configured.
- When a target is configured, missing Docker must fail.
- ZAP runtime errors must fail.
- Missing ZAP JSON reports must fail.
- Medium, high, low, or unknown ZAP alerts must fail unless explicitly allowlisted and documented.
- Informational alerts should be visible warnings, not hidden noise.

## Key Lessons

### 1. Separate Claims From Evidence

Enterprise reviewers do not need optimistic prose. They need evidence.

Good claim:

> The security gate fails on unpinned third-party GitHub Actions.

Required evidence:

- SAST rule in `scripts/security-sast.mjs`
- CI job in `.github/workflows/ci.yml`
- passing GitHub check

Weak claim:

> The project is SOC compliant.

Reason: formal SOC 2 compliance requires organizational controls and auditor evidence outside the repo.

### 2. DAST Is Website-Specific

DAST and ZAP test deployed HTTP behavior. They do not prove the TypeScript engine is secure.

Use DAST and ZAP for:

- headers
- CSP
- static asset behavior
- forms
- browser-exposed JavaScript
- Cloudflare deployment behavior

Use SAST, unit tests, dependency review, CodeQL, and package audits for:

- engine behavior
- local storage hardening
- CLI behavior
- MCP/API contracts
- supply chain
- GitHub Action behavior

### 3. Nested Packages Are Real Attack Surface

The nested `video-explainer` package had its own dependency tree. A root-only audit can pass while nested package vulnerabilities remain.

Future rule:

- Every package with its own `package-lock.json` needs install, audit, Dependabot coverage, and SBOM coverage.
- Do not assume monorepo security from root `npm audit`.

### 4. Security Scanners Must Fail Closed

A scanner that silently skips is worse than no scanner because it creates false confidence.

Required behavior:

- CI without a required target fails.
- Configured DAST/ZAP target plus missing runtime fails.
- Scanner output must be parsed.
- Missing output must fail.
- Explicit exceptions must produce warnings and documentation.

This is especially important for ZAP. A successful process exit alone is not enough. Parse the JSON report and apply the project severity policy.

### 5. ZAP Risk Parsing Needs Care

ZAP `riskdesc` values can include parenthetical confidence text, such as an informational risk with medium confidence. Do not classify risk by substring alone.

Correct approach:

- split `riskdesc` at `(`
- trim the risk label
- classify the label, not the confidence text

This prevents false failures such as treating `Informational (Medium)` as a medium severity vulnerability.

### 6. Explicit ZAP Exceptions Must Be Narrow

Cloudflare Pages may serve platform-default behavior for certain static routes from some regions or cache layers. During this pass, `robots.txt` produced a cross-domain misconfiguration alert in ZAP even after deployment changes.

Policy chosen:

- allowlist only `Cross-Domain Misconfiguration`
- only when every instance path is exactly `/robots.txt`
- emit a visible warning
- document the exception on the security page
- keep every other occurrence blocking

This is acceptable because `/robots.txt` is public crawler metadata, but broad CORS exceptions are not acceptable.

### 7. CSP Hardening Requires File-Level Discipline

Removing `unsafe-inline` is not just a header edit. It requires code movement:

- move inline scripts into external `.js`
- move inline style blocks into external `.css`
- remove `style=` attributes
- avoid event handler attributes
- use DOM APIs and `textContent` instead of HTML parsing sinks

Future rule:

- `docs/*.html` should not add inline `<script>`, inline `<style>`, `style=`, or `on*=` attributes.
- Any exception needs a clear reason and a scanner rule decision.

### 8. Static Site Changes Are Not Live Until Cloudflare Deploy

Git push does not deploy `docs/` changes for this repo.

Canonical deployment command:

```bash
npx --yes wrangler pages deploy docs/ --project-name getpcp
```

Auth check:

```bash
npx --yes wrangler whoami
```

Canonical site:

```text
https://getpcp.site
```

Do not deploy the public site to the stale `prompt-control-plane` Pages project. The active Cloudflare Pages project is `getpcp`.

### 9. pages.dev Retirement Has Limits

Deleting an obsolete Cloudflare Pages project can retire its old `pages.dev` hostname. But the active Cloudflare Pages project still receives a built-in `*.pages.dev` deployment URL.

Future reviewer wording:

- `getpcp.site` is the canonical production domain.
- The obsolete `prompt-control-plane-*.pages.dev` project should remain removed.
- The active `getpcp.pages.dev` or deployment-specific URL may continue to exist as Cloudflare platform behavior unless account-level redirects or access controls are configured.

Do not claim that all `pages.dev` URLs are retired unless verified live.

### 10. Model Support Must Be Tested Before It Is Marketed

Do not update website copy for new models unless the engine supports them and tests prove it.

Minimum standard:

- update the deterministic model catalog
- add or update routing/cost tests
- update docs and website surfaces
- run build, tests, and security gates
- deploy the website

Acceptable claim:

> PCP can estimate and route against these tested model identifiers.

Avoid unsupported claim:

> PCP runs workloads on every new model.

Reason: PCP does not call models. It routes, scores, estimates, and governs prompts deterministically.

### 11. Solo-Repo Branch Protection Needs a Clear Procedure

Default branch protection should stay strong, even for a solo repo. But an independent-review requirement can block urgent, already-green work.

Admin-pass-through procedure:

1. Confirm the PR is green and blocked only by `REVIEW_REQUIRED`.
2. Read current branch protection and save exact settings.
3. Confirm `enforce_admins.enabled` is `false`.
4. Merge the PR with admin bypass.
5. Verify PR state, open PR count, and branch protection.

Useful commands:

```bash
gh pr view <number> --json number,title,state,mergeStateStatus,reviewDecision,statusCheckRollup
gh api repos/<owner>/<repo>/branches/main/protection
gh api -X DELETE repos/<owner>/<repo>/branches/main/protection/enforce_admins
gh pr merge <number> --squash --delete-branch --admin
gh pr list --state open --json number,title,url
```

Avoid broad protection removal. The goal is to unblock a solo-owner governance mismatch while preserving required checks and review gates for non-admin paths.

### 12. GitHub API Boolean Flags Matter

When restoring branch protection, use typed GitHub CLI fields with `-F`, not string form fields with `-f`.

Wrong:

```bash
gh api -X PATCH ... -f dismiss_stale_reviews=true
```

Right:

```bash
gh api -X PATCH ... -F dismiss_stale_reviews=true
```

The string form can produce HTTP 422 because GitHub expects JSON booleans.

### 13. Evidence Artifacts Matter

CI should upload evidence, not just pass/fail statuses:

- ZAP JSON/Markdown/HTML/XML reports
- CycloneDX SBOM for root dependencies
- CycloneDX SBOM for nested dependency trees

Retain evidence long enough for enterprise review. Ninety days is a reasonable default for CI artifacts.

### 14. Browser Security Needs Parser-Based Checks

Regex can help find obvious problems, but HTML should be parsed when checking document structure.

Use parser-based checks for:

- inline style elements
- style attributes
- inline scripts
- event handler attributes

Keep regex-oriented SAST for:

- dangerous JavaScript sink names
- secret patterns
- unpinned workflow actions
- wildcard `postMessage`
- string timers
- `eval` and `new Function`

### 15. Keep Security Exceptions Documented Near The Surface

If the scanner has an exception, users and reviewers should be able to find the reason.

Minimum:

- exception in code
- warning in scanner output
- explanation in security docs

Undocumented exceptions become audit debt.

## Pre-Review Checklist

Run this before a CISO or enterprise security review.

```bash
npm ci
npm run build
npm test
npm run security:all
DAST_BASE_URL=https://getpcp.site npm run security:dast
ZAP_BASE_URL=https://getpcp.site npm run security:zap
npx --yes wrangler whoami
gh pr list --state open --json number,title,url
gh run list --limit 10
gh api repos/rishi-banerjee1/prompt-control-plane/dependabot/alerts?state=open
gh api repos/rishi-banerjee1/prompt-control-plane/code-scanning/alerts?state=open
```

Expected result:

- build passes
- tests pass
- root audit passes
- nested package audit passes
- SAST passes
- DAST passes
- ZAP passes or emits only explicitly documented informational/allowlisted warnings
- HTML parser tests pass
- no unexpected open PRs
- no unresolved high or critical Dependabot alerts
- no unresolved high CodeQL alerts
- Cloudflare auth works before deploy

## PR Readiness Checklist

Before merging a security PR:

- PR is not draft.
- All required checks are green.
- `Enterprise Security Gates` is green.
- CodeQL is green.
- Dependency Review is green.
- Any ZAP warnings are understood and documented.
- Any Cloudflare deployment was tested live if website files changed.
- Security docs were updated if controls, exceptions, or claims changed.
- Model docs were updated only if model behavior is covered by tests.
- Branch protection still preserves required checks after any solo-repo admin bypass.

## Cloudflare Checklist

For website changes:

```bash
npx --yes wrangler whoami
npx --yes wrangler pages deploy docs/ --project-name getpcp
DAST_BASE_URL=https://getpcp.site npm run security:dast
ZAP_BASE_URL=https://getpcp.site npm run security:zap
```

Then verify:

- `https://getpcp.site` is the canonical URL.
- security headers are live.
- CSP matches `docs/_headers`.
- changed CSS/JS assets are cache-busted if stale CDN behavior could confuse review.
- stale Pages projects remain retired.

## Files To Know

- `SECURITY.md`: public security model and policy.
- `security_best_practices_report.md`: CISO-facing audit report from the hardening pass.
- `.github/workflows/ci.yml`: main build, test, and enterprise security gate.
- `.github/workflows/codeql.yml`: CodeQL analysis.
- `.github/workflows/dependency-review.yml`: dependency diff review.
- `.github/CODEOWNERS`: ownership map for review.
- `scripts/security-sast.mjs`: deterministic SAST, secret scan, and action pinning.
- `scripts/security-dast.mjs`: live/static DAST-style header and CSP checks.
- `scripts/security-zap.mjs`: ZAP baseline runner and report parser.
- `scripts/html-security.mjs`: parser helpers for HTML security checks.
- `scripts/html-security.test.mjs`: HTML parser security regression tests.
- `docs/_headers`: Cloudflare Pages security headers.
- `docs/_redirects`: static redirects.
- `docs/security.html`: public website security posture.
- `docs/models.html`: website model-support claims.
- `src/estimator.ts`: model catalog and cost estimation behavior.
- `test/routing.test.ts`: model routing and cost regression coverage.

## Enterprise Response Pattern

When asked whether PCP is secure, answer with scope and evidence:

1. PCP is deterministic and local-first: no LLM calls, no telemetry, no default prompt logging.
2. The engine is covered by build, tests, CodeQL, SAST, dependency audit, Dependency Review, and SBOM generation.
3. The website is covered by Cloudflare security headers, CSP, DAST, and ZAP.
4. GitHub enforces the gates through branch protection, with an explicit admin pass-through for solo-maintainer merges after checks are green.
5. Formal ISO/SOC status depends on company-level controls and independent audit evidence.

Avoid saying:

- "ISO compliant" unless formal certification exists.
- "SOC 2 compliant" unless a SOC 2 report exists.
- "VAPT complete" unless there is a formal penetration-test report.
- "All pages.dev domains retired" unless verified and account-level behavior supports it.

## Future Improvements

These are good next investments, ordered by leverage:

1. Add a second trusted reviewer or bot-backed policy exception path for solo-repo emergency merges.
2. Add npm provenance/signing for releases if the publishing path supports it.
3. Add release attestation generation tied to SBOM artifacts.
4. Add a scheduled weekly live DAST/ZAP workflow against `https://getpcp.site`.
5. Add external VAPT with written rules of engagement.
6. Add OpenSSF Scorecard and document accepted findings.
7. Add Dependabot auto-merge only for patch/minor updates that pass all gates.
8. Add a formal compliance evidence folder or external GRC workspace for ISO/SOC artifacts.

## Final Operating Principle

For this repo, security maturity comes from deterministic controls plus honest evidence. Keep the product claims narrow, keep the gates fail-closed, keep the engine offline, and keep every public claim traceable to a test, scanner, deployment, or documented control.
