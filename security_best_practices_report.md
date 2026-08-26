# Enterprise Security Audit Report

Date: 2026-08-26
Repository: `rishi-banerjee1/prompt-control-plane`
Product: Prompt Control Plane (`pcp-engine`)
Audience: enterprise CISO / security review

## Executive Summary

Security readiness score: 4 = Exceptional for repository-level engineering controls.

Prompt Control Plane has a favorable security shape for enterprise review: deterministic TypeScript engine, local-first runtime, zero LLM calls inside the engine, no telemetry, no default prompt persistence, minimal runtime dependency surface, and cryptographic integrity controls for license validation and audit logs.

This pass upgraded the repo from "secure-by-design with partial CI coverage" to "secure-by-design with enforced security gates." The main gaps were not architectural. They were governance and automation gaps: nested dependency audit coverage, deterministic SAST/DAST checks, CODEOWNERS, dependency review, and a CISO-readable evidence trail.

Important boundary: this repository can be made audit-ready and mapped to ISO 27001 / SOC 2 engineering controls. It cannot be declared ISO 27001 certified or SOC 2 compliant by code changes alone. Formal compliance requires organizational policies, risk register, vendor management, access reviews, incident response evidence, change management evidence, and an external auditor.

## Scope Reviewed

- GitHub repository health: open PRs, open issues, Dependabot alerts, CodeQL alerts, security policy status, repository admin capability.
- Source code: `src/`, `bin/`, `test/`, static website under `docs/`, GitHub Actions, package manifests, nested `video-explainer` package.
- Security surfaces: supply chain, deterministic engine runtime, static website, browser DOM sinks, headers/CSP, GitHub CI, vulnerability disclosure, ownership controls.
- Cloudflare Pages deployment path for `getpcp.site`.

## Tools And Checks Run

- GitHub CLI review:
  - open PR inventory
  - Dependabot alert inventory
  - CodeQL alert inventory
  - repository security policy/admin status
- SCA:
  - `npm audit --audit-level=moderate`
  - `npm audit --audit-level=moderate --prefix video-explainer`
- SAST:
  - GitHub CodeQL alert review
  - repo-local deterministic scanner: `npm run security:sast`
  - targeted review for browser HTML sinks, code execution sinks, wildcard `postMessage`, and high-confidence secrets
- DAST-style checks:
  - repo-local security header and CSP scanner: `npm run security:dast`
  - live mode supported with `DAST_BASE_URL=https://getpcp.site npm run security:dast`
- Supply-chain evidence:
  - all external GitHub Actions pinned to immutable commit SHAs
  - CycloneDX 1.5 SBOM generation for root and nested video dependency trees
- Browser regression checks:
  - affected static pages loaded with their externalized scripts
  - license-gate keyboard flow and article clipboard action exercised
  - no browser console warnings or errors observed
- Manual VAPT-style review:
  - non-destructive validation of XSS paths, dependency exposure, static-site attack surface, browser storage behavior, and GitHub control gaps

No exploitative penetration test was performed against third-party infrastructure. A formal VAPT requires written scope, testing window, safe target list, rate limits, evidence handling, and ideally an independent tester.

## GitHub Findings

Open issues: none observed.

Open PRs observed:

- #40 `chore(deps): bump @types/node from 25.3.5 to 26.2.0`
- #39 `chore(ci): bump actions/setup-node from 6 to 7`
- #38 `chore(deps): bump typescript from 5.9.3 to 7.0.2`
- #36 `chore(ci): bump actions/checkout from 6 to 7`
- #35 `chore: remediate dependency audit`

Open security alerts observed on `main` before this remediation branch is merged:

- Dependabot alert #50: high severity `nanoid <3.3.18` in `video-explainer/package-lock.json`.
- CodeQL alert #25: high security severity warning for bad HTML filtering regexp in `test/languageRules.test.ts`.

Both alerts are addressed by this branch but remain open in GitHub until merged into `main` and rescanned.

Branch protection applied to `main`:

- required up-to-date status checks
- required checks: `Test (Node 20)`, `Test (Node 22)`, `Enterprise Security Gates`, `Analyze (JavaScript/TypeScript)`, `Dependency Review`
- CODEOWNER review required
- one approving review required
- stale approvals dismissed
- last-push approval required
- admins included
- linear history required
- force pushes and branch deletion blocked

## Resolved Findings

### ESEC-001: Nested dependency audit gap

Severity: High
Status: Resolved in branch

Evidence: GitHub Dependabot reported high severity `nanoid <3.3.18` in `video-explainer/package-lock.json`. The root CI audit did not cover the nested package, so the repo could be green while a nested package remained vulnerable.

Fix:

- Ran remediation in `video-explainer`.
- Added `security:audit:video`.
- Added `video-explainer` to Dependabot coverage.
- Added `video-explainer` dependency install and audit into the CI security gate.
- Added GitHub dependency review workflow for PR dependency diffs.

Control impact:

- Prevents vulnerable nested npm dependency trees from bypassing CI.
- Supports vulnerability management and secure development evidence for enterprise review.

### ESEC-002: Browser DOM XSS sinks in Enterprise admin console

Severity: High
Status: Resolved in branch

Evidence: `docs/admin.html` used dynamic HTML rendering paths around audit log parsing and custom rules. Inputs could come from pasted audit logs or local browser storage. This created a DOM XSS/self-XSS class risk in a page positioned as an Enterprise admin console.

Fix:

- Replaced dynamic `innerHTML` table/stat rendering with DOM APIs and `textContent`.
- Replaced custom-rule card rendering with DOM APIs and event listeners.
- Ensured generated command/rule output uses `textContent`.
- Added SAST gate to fail on future production browser HTML parsing sinks.

Control impact:

- Removes the highest-risk frontend injection path.
- Makes future reintroduction of HTML parsing sinks fail CI.

### ESEC-003: Security headers and CSP baseline gaps

Severity: Medium
Status: Resolved in branch

Evidence: `docs/_headers` had a CSP but lacked enterprise baseline directives such as `object-src`, `base-uri`, and `form-action`. It also did not explicitly allow known production integrations used by the site.

Fix:

- Added CSP directives: `object-src 'none'`, `base-uri 'self'`, `form-action 'self' https://formspree.io`.
- Preserved `frame-ancestors 'none'`.
- Added explicit allowlists for Cloudflare analytics, Formspree, and required images.
- Changed legacy `X-XSS-Protection` to `0`.
- Added DAST-style CI check for headers and CSP.

Control impact:

- Reduces browser attack surface.
- Provides repeatable evidence for static-site deployment security.

### ESEC-004: Security checks were present but not consolidated as global gates

Severity: Medium
Status: Resolved in branch

Evidence: CI had tests, build, CodeQL, and root audit, but no single enterprise gate covering root SCA, nested SCA, deterministic SAST, DAST header checks, and PR dependency review.

Fix:

- Added `npm run security:all`.
- Added CI job `Enterprise Security Gates`.
- Added GitHub Dependency Review workflow.
- Added CODEOWNERS for repository ownership.
- Pinned all third-party GitHub Actions to immutable commit SHAs.
- Added CI-generated CycloneDX SBOM evidence for root and nested dependency trees with 90-day retention.
- Applied GitHub branch protection to `main` with tests, CodeQL, dependency review, and enterprise security gates required.
- Kept CodeQL `security-extended` workflow.

Control impact:

- Converts ad hoc security checks into enforceable development gates.
- Supports change management, secure development, and vulnerability management evidence.

## Residual Risks

### RISK-001: Inline styles remain allowed

Severity: Low
Status: Accepted with compensating controls

Executable inline scripts and inline event handlers have been removed. CSP `script-src` no longer permits `unsafe-inline`; exact SHA-256 hashes allow the non-executable JSON-LD metadata blocks. The static site still uses inline style blocks and attributes, so `style-src 'unsafe-inline'` remains for presentation compatibility.

Compensating controls:

- `script-src` is strict and does not allow inline execution or `unsafe-eval`.
- browser HTML parsing and code-execution sinks fail the deterministic SAST gate.
- CSP blocks objects, framing, and unapproved form destinations.

Recommended next step:

- Move inline styles into same-origin stylesheets and remove `unsafe-inline` from `style-src` as a lower-priority hardening item.

### RISK-002: Formal VAPT not completed

Severity: Medium
Status: Requires external process

This pass performed non-destructive VAPT-style review and automated DAST-style checks. It did not perform a formal penetration test. For an enterprise CISO audit, the honest answer is that independent VAPT is planned or scheduled unless there is already an external report.

Recommended evidence:

- signed rules of engagement
- scope covering `getpcp.site`, npm package, CLI, GitHub Action, and MCP stdio server
- test dates and tester identity
- findings with severity, exploitability, reproduction, and remediation
- retest evidence

### RISK-003: GitHub alerts close only after merge and rescan

Severity: Medium
Status: Operational dependency

The Dependabot and CodeQL alerts are visible against `main`. This branch fixes them, but GitHub will not mark them fixed until the remediation is merged into `main` and scanners run on the new commit.

Recommended next step:

- Merge the remediation PR after checks pass.
- Confirm Dependabot alert #50 and CodeQL alert #25 auto-close.

Operational note: branch protection now correctly blocks self-approval. If the repository has only one maintainer, add a second trusted reviewer before merge rather than weakening the control.

### RISK-004: Compliance claims require organizational controls

Severity: Medium
Status: Outside code-only remediation

Engineering controls now map well to ISO 27001 and SOC 2 security criteria, but formal compliance requires non-code evidence:

- risk assessment and risk treatment plan
- access reviews
- employee/vendor onboarding and offboarding
- incident response plan and tabletop evidence
- secure SDLC policy
- vulnerability management policy
- change approval records
- backup/recovery evidence where applicable
- vendor/subprocessor inventory
- audit logging and retention policy

## Compliance Mapping

This mapping is readiness evidence, not certification.

### ISO/IEC 27001:2022 readiness mapping

- Secure development and change control: CI build/test gates, CodeQL, dependency review, CODEOWNERS, immutable action references.
- Technical vulnerability management: root and nested `npm audit`, Dependabot, GitHub security alerts, dependency review gate.
- Secure coding: deterministic SAST, DOM XSS sink removal, dangerous code-execution sink detection.
- Configuration management: checked-in Cloudflare Pages headers, security gate scripts, reproducible lockfile installs, CycloneDX SBOM artifacts.
- Logging and monitoring: GitHub Actions evidence, CodeQL history, Dependabot alerts, hash-chained product audit trail.
- Information security in projects: `SECURITY.md`, security report, explicit residual risk tracking.

### SOC 2 readiness mapping

- Security: least-privilege GitHub Actions permissions, static-site security headers, deterministic runtime, no default network/telemetry, secure disclosure policy.
- Change management: PR-based CI gates, CODEOWNERS, dependency review, build/test checks.
- Risk mitigation: Dependabot, CodeQL, audit gates, documented residual risks.
- Confidentiality support: local-first runtime, no prompt logging by default, no LLM calls inside engine, session sensitivity documented.
- Availability support: dependency DoS vulnerability patched, security issue SLAs documented.

## CISO Audit Packet

Provide these artifacts:

- `SECURITY.md`
- `security_best_practices_report.md`
- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/dependency-review.yml`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `docs/_headers`
- `cyclonedx-sboms` artifact from the latest `Enterprise Security Gates` run
- latest GitHub Actions run for this branch
- latest Cloudflare Pages deployment URL: `https://f28b2373.getpcp.pages.dev`
- public production domain live DAST target: `https://getpcp.site`
- GitHub Dependabot and CodeQL alert screenshots after merge/rescan

## CISO Talking Points

- The engine is deterministic and makes zero LLM calls internally.
- The default runtime is offline and does not transmit prompts or telemetry.
- Prompts are not logged by default.
- Enterprise controls include policy enforcement, config locking, local audit trail, and custom deterministic rules.
- CI now gates all development on tests, build, SCA, SAST, DAST-style headers/CSP checks, CodeQL, and PR dependency review.
- Known high security alerts are fixed in the remediation branch and require merge/rescan to close in GitHub.
- Formal ISO/SOC compliance is not claimed from code alone; this repo supplies engineering evidence for the audit.

## Next 30-Day Hardening Plan

1. Externalize inline styles, then remove `unsafe-inline` from `style-src`.
2. Schedule independent VAPT for `getpcp.site`, npm package, CLI, GitHub Action, and MCP stdio server.
3. Add npm release provenance and signed attestations.
4. Evaluate signed commit enforcement once all maintainers have signing configured.
5. Confirm GitHub Dependabot and CodeQL alerts are closed after merge.
6. Add quarterly access review and annual incident-response tabletop evidence outside the repo.

## Current Enterprise Readiness Decision

Decision: suitable for enterprise security review with disclosed residuals.

Not suitable for a final ISO/SOC certification claim until organizational control evidence and independent audit evidence exist.
